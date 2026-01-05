import { getAuthorizedXero } from "../../../lib/xeroAuthRedis";

/* ---------- DATE HELPERS ---------- */
function normalizeDate(dateStr) {
  if (!dateStr) return null;

  // DD/MM/YYYY → YYYY-MM-DD
  if (dateStr.includes("/")) {
    const [dd, mm, yyyy] = dateStr.split("/");
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }

  return String(dateStr).slice(0, 10);
}

function addDays(isoDate, days) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { invoices } = req.body || {};

    if (!Array.isArray(invoices) || invoices.length === 0) {
      return res.status(400).json({ error: "No invoices provided" });
    }

    /* ---------- FORCE ACCOUNT CODE ---------- */
    const ACCOUNT_CODE = "200"; // ✅ ALWAYS USE 200

    /* ---------- AUTH ---------- */
    const { xero, tenantId } = await getAuthorizedXero();

    const created = [];
    const errors = [];

    for (const invoice of invoices) {
      try {
        if (!invoice.accountId || !invoice.issueDate) {
          errors.push({
            accountId: invoice.accountId,
            error: "Missing accountId or issueDate",
          });
          continue;
        }

        if (!Array.isArray(invoice.lineItems) || invoice.lineItems.length === 0) {
          errors.push({
            accountId: invoice.accountId,
            error: "No line items",
          });
          continue;
        }

        /* ---------- FIND CONTACT BY ACCOUNT NUMBER ---------- */
        const safeAccountId = String(invoice.accountId).replace(/"/g, '\\"');

        const contacts = await xero.accountingApi.getContacts(
          tenantId,
          undefined,
          `AccountNumber=="${safeAccountId}"`
        );

        const contact = contacts.body.contacts?.[0];

        if (!contact?.contactID) {
          errors.push({
            accountId: invoice.accountId,
            error: "Contact not found in Xero",
          });
          continue;
        }

        /* ---------- BUILD INVOICE ---------- */
        const issueDate = normalizeDate(invoice.issueDate);
        if (!issueDate) {
          errors.push({
            accountId: invoice.accountId,
            error: "Invalid issueDate",
          });
          continue;
        }

        const dueDate =
          normalizeDate(invoice.dueDate) ||
          addDays(issueDate, 21);

        const payload = {
          type: "ACCREC",
          contact: {
            contactID: contact.contactID,
          },
          date: issueDate,
          dueDate,
          lineAmountTypes: "Exclusive",
          lineItems: invoice.lineItems.map((item) => ({
            description: item.description || "Sales Item",
            quantity: Number(item.quantity || 1),
            unitAmount: Number(item.unitAmount),
            accountCode: ACCOUNT_CODE, // ✅ FIXED
          })),
          status: "DRAFT",
        };

        const response = await xero.accountingApi.createInvoices(
          tenantId,
          { invoices: [payload] },
          true,
          2
        );

        created.push({
          accountId: invoice.accountId,
          invoiceId: response.body.invoices?.[0]?.invoiceID,
          invoiceNumber: response.body.invoices?.[0]?.invoiceNumber,
        });

      } catch (err) {
        errors.push({
          accountId: invoice.accountId,
          error: err?.response?.body || err.message,
        });
      }
    }

    return res.json({
      success: errors.length === 0,
      createdCount: created.length,
      errorCount: errors.length,
      created,
      errors,
    });

  } catch (err) {
    console.error("XERO CREATE INVOICE ERROR:", err.response?.body || err.message);
    return res.status(500).json({
      error: "Xero invoice creation failed",
      details: err.response?.body || err.message,
    });
  }
}

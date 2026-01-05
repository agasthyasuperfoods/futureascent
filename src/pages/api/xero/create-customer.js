import { getAuthorizedXero } from "../../../lib/xeroAuthRedis";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { accountId, name, deliveryAddress } = req.body;

    if (!accountId || !name) {
      return res.status(400).json({
        error: "accountId and name are required",
      });
    }

    /* ---------- AUTH ---------- */
    const { xero, tenantId } = await getAuthorizedXero();

    /* ---------- CONTACT (SDK FORMAT) ---------- */
    const contact = {
      name: name,
      accountNumber: accountId,
      isCustomer: true,
    };

    if (deliveryAddress) {
      contact.addresses = [
        {
          addressType: "DELIVERY",
          addressLine1: deliveryAddress.addressLine1,
          city: deliveryAddress.city,
          region: deliveryAddress.region,
          postalCode: deliveryAddress.postalCode,
          country: deliveryAddress.country,
        },
        {
          addressType: "STREET",
          addressLine1: deliveryAddress.addressLine1,
          city: deliveryAddress.city,
          region: deliveryAddress.region,
          postalCode: deliveryAddress.postalCode,
          country: deliveryAddress.country,
        },
      ];
    }

    /* ---------- CREATE / UPDATE ---------- */
    const response = await xero.accountingApi.createContacts(
      tenantId,
      {
        contacts: [contact], // ⚠️ lowercase `contacts`
      }
    );

    const saved = response.body.contacts?.[0];

    return res.json({
      success: true,
      contactId: saved.contactID,
      name: saved.name,
      accountId: saved.accountNumber,
      addressSaved: !!deliveryAddress,
    });

  } catch (err) {
    console.error("XERO ERROR:", err?.response?.body || err);
    return res.status(500).json({
      error: "Xero operation failed",
      details: err?.response?.body || err.message,
    });
  }
}

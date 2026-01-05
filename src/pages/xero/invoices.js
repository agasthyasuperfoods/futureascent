"use client";
import { useState } from "react";
import Papa from "papaparse";
import { useRouter } from "next/router";
import Swal from "sweetalert2";

const PREFIX = "METCASH FOOD & GROCERY PTY LTD - ";

function normalizeKey(value) {
  return String(value).trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getFirstValue(row, keys) {
  const entries = Object.entries(row || {});

  for (const key of keys) {
    const target = normalizeKey(key);
    for (const [rawKey, value] of entries) {
      if (normalizeKey(rawKey) === target) {
        if (value !== undefined && value !== null && String(value).trim() !== "") {
          return value;
        }
      }
    }
  }

  for (const key of keys) {
    const target = normalizeKey(key);
    for (const [rawKey, value] of entries) {
      if (normalizeKey(rawKey).includes(target)) {
        if (value !== undefined && value !== null && String(value).trim() !== "") {
          return value;
        }
      }
    }
  }

  return null;
}

function parseNumber(value) {
  if (value === undefined || value === null) return NaN;
  const cleaned = String(value).replace(/[$,]/g, "").trim();
  if (!cleaned) return NaN;
  return Number(cleaned);
}

function parseInvoiceDate(rawDate) {
  if (!rawDate) return null;
  const cleaned = String(rawDate).trim();

  const withoutTime = cleaned.split(" ")[0];
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(withoutTime)) {
    const [dd, mm, yyyy] = withoutTime.split("/");
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return cleaned;
  }

  const parts = cleaned.split(/[\/\-.]/);
  if (parts.length !== 3) return null;

  let yyyy;
  let mm;
  let dd;

  if (parts[0].length === 4) {
    yyyy = parts[0];
    mm = parts[1];
    dd = parts[2];
  } else if (parts[2].length === 4) {
    yyyy = parts[2];
    const a = Number(parts[0]);
    const b = Number(parts[1]);
    if (a > 12) {
      dd = parts[0];
      mm = parts[1];
    } else if (b > 12) {
      dd = parts[1];
      mm = parts[0];
    } else {
      dd = parts[0];
      mm = parts[1];
    }
  }

  if (!yyyy || !mm || !dd) return null;
  return `${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}

function addDays(dateString, days) {
  const base = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(base.getTime())) return null;
  base.setDate(base.getDate() + days);
  const yyyy = base.getFullYear();
  const mm = String(base.getMonth() + 1).padStart(2, "0");
  const dd = String(base.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function Invoices() {
  const router = useRouter();

  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);

  const [existing, setExisting] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [newCustomers, setNewCustomers] = useState([]);

  const [invoiceMap, setInvoiceMap] = useState({});

  /* ================= CSV UPLOAD ================= */
  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    setLoading(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async ({ data }) => {
        const customersMap = new Map();
        const invoices = {};

        for (const row of data) {
          /* ---------- CUSTOMER ---------- */
          const accountId = getFirstValue(row, [
            "customer id",
            "customerid",
            "account id",
            "accountid",
            "account number",
            "account no",
          ]);

          if (!accountId) continue;
          const cleanId = accountId.trim();

          const name =
            getFirstValue(row, [
              "retailer",
              "store name",
              "customer name",
              "account name",
            ]) || "";

          if (!customersMap.has(cleanId)) {
            customersMap.set(cleanId, {
              accountId: cleanId,
              name: `${PREFIX}${name}`.trim(),
            });
          }

          /* ---------- DATE ---------- */
          const rawDate = getFirstValue(row, [
            "invoice date",
            "invoicedate",
            "date",
            "transaction date",
            "order date",
          ]);

          const issueDate = parseInvoiceDate(rawDate);
          if (!issueDate) continue;

          /* ---------- LINE ITEM (METCASH SAFE) ---------- */
          const description =
            getFirstValue(row, [
              "description",
              "item description",
              "stock description",
              "article description",
              "product",
              "item",
              "item name",
              "product name",
            ]) || "Sales Item";

          const quantity = parseNumber(
            getFirstValue(row, [
              "qty sold",
              "quantity sold",
              "qty",
              "quantity",
              "units",
              "units sold",
              "ordered qty",
              "approved qty",
            ]) || 1
          );

          const lineAmount = parseNumber(
            getFirstValue(row, [
              "line amount",
              "line total",
              "amount",
              "total ex gst",
              "total",
              "ext price",
              "extended price",
              "sell price",
              "net amount",
              "total ex gst",
              "total (ex gst)",
            ])
          );

          let unitAmount = parseNumber(
            getFirstValue(row, [
              "unit price",
              "rate",
              "price",
              "price (excl gst)",
              "price excl gst",
            ])
          );

          if ((!unitAmount || Number.isNaN(unitAmount)) && lineAmount > 0) {
            unitAmount = lineAmount / (quantity || 1);
          }

          if (!unitAmount || Number.isNaN(unitAmount) || unitAmount <= 0) {
            continue;
          }

          const orderNumber = getFirstValue(row, [
            "order number",
            "order no",
          ]);

          const invoiceKey = orderNumber
            ? String(orderNumber).trim()
            : `${cleanId}__${issueDate}`;
          if (!invoices[invoiceKey]) {
            invoices[invoiceKey] = {
              accountId: cleanId,
              issueDate,
              dueDate: addDays(issueDate, 21),
              lineItems: [],
            };
          }

          invoices[invoiceKey].lineItems.push({
            description,
            quantity: quantity || 1,
            unitAmount,
          });
        }

        /* ---------- CHECK CUSTOMERS IN XERO ---------- */
        const ex = [];
        const con = [];
        const neu = [];

        for (const row of customersMap.values()) {
          const res = await fetch("/api/xero/check-customer", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(row),
          });

          const data = await res.json();

          if (data.status === "EXACT_MATCH") ex.push(data);
          else if (data.status === "NAME_CONFLICT") con.push(data);
          else neu.push(row);
        }

        setExisting(ex);
        setConflicts(con);
        setNewCustomers(neu);
        setInvoiceMap(invoices);
        setLoading(false);
      },
    });
  }

  /* ================= CREATE INVOICES ================= */
  async function createInvoices() {
    const invoices = Object.values(invoiceMap).filter(
      (i) => i.lineItems.length > 0
    );

    if (!invoices.length) {
      alert("No invoice data found in CSV");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/xero/create-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoices }),
      });

      const result = await res.json();

      if (!res.ok) {
        await Swal.fire({
          icon: "error",
          title: "Invoice creation failed",
          text: result?.error || "Failed to create invoices",
        });
        return;
      }

      if (result.errorCount > 0) {
        await Swal.fire({
          icon: "warning",
          title: "Partial success",
          text: `Created ${result.createdCount} invoice(s), ${result.errorCount} failed`,
        });
        return;
      }

      await Swal.fire({
        icon: "success",
        title: "Invoices created",
        text: "Invoices created successfully in Xero",
      });
    } catch (err) {
      console.error(err);
      await Swal.fire({
        icon: "error",
        title: "Invoice creation failed",
        text: "Failed to create invoices",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#faf7fb]">
      <header className="flex justify-between px-8 py-5 bg-white border-b">
        <h1 className="text-xl font-bold text-violet-700">
          Create Customers & Invoices (Xero)
        </h1>
        <button onClick={() => router.push("/")}>← Home</button>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-10">
        <div className="bg-white p-8 rounded-xl shadow text-center mb-8">
          <label className="cursor-pointer bg-violet-600 text-white px-6 py-2 rounded-lg">
            Choose CSV
            <input type="file" hidden onChange={handleFile} />
          </label>
          {fileName && <p className="mt-2">{fileName}</p>}
          {loading && <p className="mt-4">Processing…</p>}
        </div>

        <div className="grid grid-cols-3 gap-6 mb-8">
          <Stat title="Existing" value={existing.length} />
          <Stat title="Conflicts" value={conflicts.length} />
          <Stat title="New Customers" value={newCustomers.length} />
        </div>

        <button
          onClick={createInvoices}
          className="w-full bg-violet-600 text-white py-3 rounded-xl font-semibold"
        >
          Create Invoices
        </button>
      </main>
    </div>
  );
}

/* ---------- COMPONENT ---------- */
function Stat({ title, value }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow text-center">
      <h3 className="text-2xl font-bold">{value}</h3>
      <p>{title}</p>
    </div>
  );
}

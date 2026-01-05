"use client";
import { useState } from "react";
import Papa from "papaparse";
import { useRouter } from "next/router";

const PREFIX = "METCASH FOOD & GROCERY PTY LTD - ";

export default function Invoices() {
  const router = useRouter();

  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);

  const [existing, setExisting] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [newCustomers, setNewCustomers] = useState([]);

  const [customersCreated, setCustomersCreated] = useState(false); // ✅ NEW

  /* =========================
     CSV UPLOAD + PROCESS
     ========================= */
  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    setLoading(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (result) => {

        const map = new Map();

        result.data.forEach((row) => {
          const accountId =
            row["Account ID"] ||
            row["Customer ID"] ||
            row["AccountID"];

          const rawName =
            row["Retailer"] ||
            row["Store Name"] ||
            row["Customer Name"];

          if (!accountId || !rawName) return;

          const cleanId = accountId.trim();

          if (!map.has(cleanId)) {
            map.set(cleanId, {
              accountId: cleanId,
              name: `${PREFIX}${rawName.trim()}`,
            });
          }
        });

        const uniqueRows = Array.from(map.values());

        const ex = [];
        const con = [];
        const neu = [];

        for (const row of uniqueRows) {
          const res = await fetch("/api/xero/check-customer", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(row),
          });

          const data = await res.json();

          if (data.status === "EXACT_MATCH") {
            ex.push(data);
          } 
          else if (data.status === "NAME_CONFLICT") {
            con.push(data);
          } 
          else {
            const lookup = await fetch("/api/customers/lookup", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: row.name }),
            });

            const db = await lookup.json();

            neu.push({
              ...row,
              shippingAddress: db.found
                ? {
                    line1: db.customer.address_line1,
                    city: db.customer.city,
                    state: db.customer.region,
                    postcode: db.customer.postal_code,
                  }
                : {
                    line1: "",
                    city: "",
                    state: "",
                    postcode: "",
                  },
            });
          }
        }

        setExisting(ex);
        setConflicts(con);
        setNewCustomers(neu);
        setCustomersCreated(false); // reset
        setLoading(false);
      },
    });
  }

  /* =========================
     CREATE CUSTOMERS
     ========================= */
  async function createCustomers() {
    setLoading(true);

    try {
      for (const c of newCustomers) {
        await fetch("/api/xero/create-customer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountId: c.accountId,
            name: c.name,
            deliveryAddress: {
              addressLine1: c.shippingAddress.line1,
              city: c.shippingAddress.city,
              region: c.shippingAddress.state,
              postalCode: c.shippingAddress.postcode,
              country: "Australia",
            },
          }),
        });
      }

      alert("✅ Customers created successfully");
      setCustomersCreated(true); // ✅ SHOW INVOICE BUTTON

    } catch (err) {
      console.error(err);
      alert("❌ Failed to create customers");
    } finally {
      setLoading(false);
    }
  }

  /* =========================
     CREATE INVOICES
     ========================= */
  async function createInvoices() {
    setLoading(true);

    try {
      for (const c of newCustomers) {
        await fetch("/api/xero/create-invoice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountId: c.accountId,
            name: c.name,
          }),
        });
      }

      alert("✅ Invoices created successfully");

    } catch (err) {
      console.error(err);
      alert("❌ Failed to create invoices");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#faf7fb]">

      {/* HEADER */}
      <header className="flex items-center justify-between px-8 py-5 bg-white border-b">
        <h1 className="text-xl font-bold text-violet-700">
          Create Customers & Invoices (Xero)
        </h1>
        <button onClick={() => router.push("/")}>← Home</button>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-10">

        {/* UPLOAD */}
        <div className="bg-white p-8 rounded-xl shadow mb-8 text-center">
          <p className="font-semibold mb-3">Upload CSV</p>

          <label className="inline-block">
            <span className="px-6 py-2 bg-violet-600 text-white rounded-lg cursor-pointer font-semibold">
              Choose File
            </span>
            <input
              type="file"
              accept=".csv"
              onChange={handleFile}
              className="hidden"
            />
          </label>

          {fileName && (
            <p className="text-sm text-violet-600 mt-3">{fileName}</p>
          )}

          {loading && (
            <p className="mt-4 text-sm">⏳ Processing…</p>
          )}
        </div>

        {/* STATS */}
        {!loading && (
          <div className="grid grid-cols-3 gap-6 mb-10">
            <Stat title="Existing" value={existing.length} />
            <Stat title="Name Conflicts" value={conflicts.length} />
            <Stat title="New Customers" value={newCustomers.length} />
          </div>
        )}

        {/* EXISTING */}
        <Table
          title="Existing Customers"
          headers={["Account ID", "Name"]}
          rows={existing.map((r) => [r.accountId, r.name])}
        />

        {/* CONFLICTS */}
        <Table
          title="⚠️ Name Conflicts"
          headers={["Incoming → Existing", "Name"]}
          rows={conflicts.map((r) => [
            `${r.incomingAccountId} → ${r.existingAccountId}`,
            r.name,
          ])}
        />

        {/* NEW CUSTOMERS */}
        {newCustomers.length > 0 && (
          <div className="bg-white p-6 rounded-xl shadow">
            <h3 className="text-lg font-semibold mb-4">🆕 New Customers</h3>

            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2">Account</th>
                  <th className="p-2">Name</th>
                  <th className="p-2">Address</th>
                </tr>
              </thead>
              <tbody>
                {newCustomers.map((c) => (
                  <tr key={c.accountId} className="border-t">
                    <td className="p-2">{c.accountId}</td>
                    <td className="p-2">{c.name}</td>
                    <td className="p-2">
                      {c.shippingAddress.line1 || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <button
              onClick={createCustomers}
              className="mt-6 w-full bg-pink-600 text-white py-2 rounded-xl font-semibold"
            >
              Create Customers
            </button>

            {customersCreated && (
              <button
                onClick={createInvoices}
                className="mt-4 w-full bg-violet-600 text-white py-2 rounded-xl font-semibold"
              >
                Create Invoices
              </button>
            )}
          </div>
        )}

      </main>
    </div>
  );
}

/* ================= COMPONENTS ================= */

function Stat({ title, value }) {
  return (
    <div className="bg-white rounded-xl p-6 text-center shadow">
      <h3 className="text-2xl font-bold">{value}</h3>
      <p>{title}</p>
    </div>
  );
}

function Table({ title, headers, rows }) {
  if (!rows.length) return null;
  return (
    <div className="bg-white rounded-xl p-6 mb-8 shadow">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <table className="w-full text-sm">
        <thead className="bg-gray-100">
          <tr>
            {headers.map((h) => (
              <th key={h} className="p-2 text-left">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t">
              {r.map((c, j) => (
                <td key={j} className="p-2">{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

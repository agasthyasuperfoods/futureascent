"use client";
import { useState } from "react";
import Papa from "papaparse";
import { useRouter } from "next/router";

/* 🔑 CONSTANT PREFIX */
const METCASH_PREFIX = "METCASH FOOD & GROCERY PTY LTD - ";

export default function Createcustomers() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [rows, setRows] = useState([]);
  const [existing, setExisting] = useState([]);
  const [missing, setMissing] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState("");

  /* ===============================
     STEP 1 — UPLOAD CSV
     =============================== */
  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    setLoading(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (result) => {
        const parsed = [];

        result.data.forEach((row) => {
          const customerId =
            row["Customer ID"] ||
            row["Account ID"] ||
            row["AccountID"];

          const retailerName =
            row["Retailer"] ||
            row["Customer Name"] ||
            row["Account Name"] ||
            row["Store Name"];

          if (!customerId) return;

          parsed.push({
            customerId: customerId.trim(),
            name: retailerName
              ? `${METCASH_PREFIX}${retailerName.trim()}`
              : "",
            address: "",
          });
        });

        setRows(parsed);
        await checkCustomers(parsed);
      },
    });
  }

  /* ===============================
     STEP 2 — AUTO CHECK CUSTOMERS
     =============================== */
  async function checkCustomers(sourceRows) {
    const uniqueIds = [...new Set(sourceRows.map((r) => r.customerId))];
    const exist = [];
    const miss = [];

    for (let i = 0; i < uniqueIds.length; i++) {
      const id = uniqueIds[i];

      const res = await fetch("/api/xero/check-customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: id }),
      });

      const data = await res.json();

      if (data.exists) {
        exist.push({
          accountId: id,
          name: data.name,
        });
      } else {
        const row = sourceRows.find((r) => r.customerId === id);
        miss.push(row);
      }
    }

    setExisting(exist);
    setMissing(miss);
    setLoading(false);
    setStep(3);
  }

  /* ===============================
     UPDATE ADDRESS
     =============================== */
  function updateAddress(index, value) {
    const updated = [...missing];
    updated[index].address = value;
    setMissing(updated);
  }

  /* ===============================
     PLACEHOLDER ACTION
     =============================== */
  function createCustomers() {
    alert(`Create ${missing.length} customers in Xero`);
    console.log("Customers payload:", missing);
  }

  return (
    <div className="min-h-screen bg-[#faf7fb]">

      {/* ================= HEADER ================= */}
      <header className="flex items-center justify-between px-8 py-5 bg-white border-b border-violet-200">
        <div className="flex items-center gap-3">
          <img
            src="/fa.jpeg"
            alt="Future Ascent"
            className="h-10 w-auto rounded-lg"
          />
          <h1 className="text-xl font-bold text-violet-700">
            Create Bulk Invoices (Xero)
          </h1>
        </div>

        <button
          onClick={() => router.push("/")}
          className="text-sm text-violet-600 hover:underline"
        >
          ← Back 
        </button>
      </header>

      {/* ================= BODY ================= */}
      <main className="px-8 py-10 max-w-7xl mx-auto">

        {/* STEPPER */}
        <div className="flex justify-between mb-6">
          {["Upload CSV", "Processing", "Review"].map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                  step >= i + 1 ? "bg-pink-600" : "bg-gray-300"
                }`}
              >
                {i + 1}
              </div>
              <span>{label}</span>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow p-8">

          {/* STEP 1 */}
          {step === 1 && (
            <div className="border-2 border-dashed border-violet-300 rounded-xl p-10 text-center relative">
              <input
                type="file"
                accept=".csv"
                onChange={handleFile}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <p className="font-semibold">Upload CSV file</p>
              {fileName && (
                <p className="text-violet-600 mt-2">{fileName}</p>
              )}
            </div>
          )}

          {/* LOADING */}
          {loading && (
            <p className="mt-4 text-sm">
              ⏳ Checking customers in Xero…
            </p>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <>
              {/* STATS */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <Stat label="Total" value={existing.length + missing.length} />
                <Stat label="Existing" value={existing.length} />
                <Stat label="New" value={missing.length} />
              </div>

              <div className="grid grid-cols-2 gap-6">

                {/* EXISTING */}
                <Box title="Existing Customers" color="green">
                  <Table
                    headers={["Account ID", "Customer Name"]}
                    rows={existing.map((c) => [c.accountId, c.name])}
                  />
                </Box>

                {/* NEW */}
                <Box title="New Customers" color="yellow">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr>
                        <th className="text-left p-2 bg-gray-100">Account ID</th>
                        <th className="text-left p-2 bg-gray-100">Customer Name</th>
                        <th className="text-left p-2 bg-gray-100">Shipping Address</th>
                      </tr>
                    </thead>
                    <tbody>
                      {missing.map((c, i) => (
                        <tr key={c.customerId}>
                          <td className="p-2">{c.customerId}</td>
                          <td className="p-2">{c.name}</td>
                          <td className="p-2">
                            <input
                              className="border rounded px-2 py-1 w-full"
                              placeholder="Enter address"
                              value={c.address}
                              onChange={(e) =>
                                updateAddress(i, e.target.value)
                              }
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {missing.length > 0 && (
                    <button
                      onClick={createCustomers}
                      className="mt-4 w-full bg-pink-600 text-white py-2 rounded-xl font-semibold"
                    >
                      Create New Customers
                    </button>
                  )}
                </Box>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

/* ================= SMALL COMPONENTS ================= */

function Stat({ label, value }) {
  return (
    <div className="bg-[#faf5ff] rounded-xl p-4 text-center">
      <h3 className="text-xl font-bold">{value}</h3>
      <p className="text-sm text-gray-600">{label}</p>
    </div>
  );
}

function Box({ title, children, color }) {
  const map = {
    green: "bg-green-50 border-green-300",
    yellow: "bg-yellow-50 border-yellow-300",
  };
  return (
    <div className={`border rounded-xl p-4 ${map[color]}`}>
      <h4 className="font-semibold mb-2">{title}</h4>
      {children}
    </div>
  );
}

function Table({ headers, rows }) {
  return (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr>
          {headers.map((h) => (
            <th key={h} className="text-left p-2 bg-gray-100">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            {r.map((c, j) => (
              <td key={j} className="p-2">
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

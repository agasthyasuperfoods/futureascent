"use client";
import { useState, useEffect } from "react";
import Papa from "papaparse";

export default function XeroCustomerUpload() {
  const [step, setStep] = useState(1);
  const [rows, setRows] = useState([]);
  const [existingCustomers, setExistingCustomers] = useState([]);
  const [newCustomers, setNewCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState("");

  /* =====================================================
     🔐 PAGE-LEVEL XERO AUTH GUARD
     ===================================================== */
  useEffect(() => {
    async function ensureXeroLogin() {
      const res = await fetch("/api/xero/status");
      const data = await res.json();

      if (!data.connected) {
        window.location.href = "/api/xero/login";
      }
    }
    ensureXeroLogin();
  }, []);

  /* =====================================================
     STEP 1 — CSV UPLOAD
     ===================================================== */
  function handleCSVUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => {
        const parsed = [];

        data.forEach((row) => {
          const customerId =
            row["Customer ID"] ||
            row["Account ID"] ||
            row["AccountID"];

          if (customerId) {
            parsed.push({ accountId: customerId.trim() });
          }
        });

        setRows(parsed);
        setStep(2);
      },
    });
  }

  /* =====================================================
     STEP 2 — CHECK CUSTOMERS IN XERO (AUTH SAFE)
     ===================================================== */
  async function checkCustomersInXero() {
    setLoading(true);

    // 🔐 auth check first
    const statusRes = await fetch("/api/xero/status");
    const status = await statusRes.json();

    if (!status.connected) {
      window.location.href = "/api/xero/login";
      return;
    }

    const uniqueIds = [...new Set(rows.map((r) => r.accountId))];
    const exists = [];
    const missing = [];

    for (const id of uniqueIds) {
      const res = await fetch("/api/xero/check-customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: id }),
      });

      // 🔐 API-level fallback
      if (res.status === 401) {
        const data = await res.json();
        window.location.href = data.redirect || "/api/xero/login";
        return;
      }

      const data = await res.json();

      if (data.exists) {
        exists.push({
          accountId: id,
          name: data.name,
          xeroContactId: data.contactId,
        });
      } else {
        missing.push({ accountId: id });
      }
    }

    setExistingCustomers(exists);
    setNewCustomers(missing);
    setLoading(false);
    setStep(3);
  }

  /* =====================================================
     STEP 3 — CREATE CUSTOMERS (AUTH SAFE)
     ===================================================== */
  async function createCustomersInXero() {
    const res = await fetch("/api/xero/status");
    const data = await res.json();

    if (!data.connected) {
      window.location.href = "/api/xero/login";
      return;
    }

    alert(`Ready to create ${newCustomers.length} customers in Xero`);
    // later → POST /api/xero/create-customer
  }

  return (
    <div className="min-h-screen bg-[#faf7fb]">

      {/* ================= HEADER ================= */}
      <header className="bg-white border-b border-violet-200">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/fa.jpeg" alt="Future Ascent" className="h-9 rounded" />
            <div>
              <p className="text-sm text-gray-500">Future Ascent · Operations</p>
              <h1 className="text-lg font-bold text-violet-700">
                Xero Customer Management
              </h1>
            </div>
          </div>

          <button
            onClick={() => window.history.back()}
            className="text-sm text-violet-600 hover:underline"
          >
            ← Back to Operations
          </button>
        </div>
      </header>

      {/* ================= BODY ================= */}
      <main className="p-10">
        <div className="max-w-5xl mx-auto">

          <Stepper step={step} />

          <div className="bg-white rounded-2xl shadow p-8 mt-6">

            {step === 1 && (
              <UploadBox
                fileName={fileName}
                onUpload={handleCSVUpload}
              />
            )}

            {step === 2 && (
              <>
                <p className="mb-4">
                  Parsed customers: <b>{rows.length}</b>
                </p>
                <PrimaryButton onClick={checkCustomersInXero}>
                  Check Customers in Xero
                </PrimaryButton>
              </>
            )}

            {step === 3 && (
              <>
                <Stats
                  total={existingCustomers.length + newCustomers.length}
                  existing={existingCustomers.length}
                  fresh={newCustomers.length}
                />

                <div className="grid grid-cols-2 gap-6 mt-6">
                  <CustomerTable
                    title="Existing in Xero"
                    data={existingCustomers}
                    type="existing"
                  />
                  <CustomerTable
                    title="New Customers"
                    data={newCustomers}
                    type="new"
                  />
                </div>

                {newCustomers.length > 0 && (
                  <div className="mt-6">
                    <PrimaryButton onClick={createCustomersInXero}>
                      Create New Customers in Xero
                    </PrimaryButton>
                  </div>
                )}
              </>
            )}

            {loading && <p className="mt-4">⏳ Processing…</p>}
          </div>
        </div>
      </main>
    </div>
  );
}

/* ================= COMPONENTS ================= */

function Stepper({ step }) {
  const steps = ["Upload CSV", "Check Customers", "Review"];
  return (
    <div className="flex justify-between">
      {steps.map((s, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full text-white flex items-center justify-center font-bold ${
              step >= i + 1 ? "bg-pink-600" : "bg-gray-300"
            }`}
          >
            {i + 1}
          </div>
          <span>{s}</span>
        </div>
      ))}
    </div>
  );
}

function UploadBox({ onUpload, fileName }) {
  return (
    <div className="border-2 border-dashed border-violet-300 rounded-xl p-10 text-center relative">
      <input
        type="file"
        accept=".csv"
        onChange={onUpload}
        className="absolute inset-0 opacity-0 cursor-pointer"
      />
      <p className="font-semibold">Upload CSV file</p>
      {fileName && <p className="text-violet-600 mt-2">{fileName}</p>}
    </div>
  );
}

function Stats({ total, existing, fresh }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <StatCard label="Total" value={total} />
      <StatCard label="Existing" value={existing} />
      <StatCard label="New" value={fresh} />
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="bg-[#faf7fb] rounded-xl p-4 text-center">
      <h3 className="text-xl font-bold">{value}</h3>
      <p className="text-sm text-gray-600">{label}</p>
    </div>
  );
}

function CustomerTable({ title, data, type }) {
  return (
    <div
      className={`rounded-xl p-4 border ${
        type === "existing"
          ? "border-green-300 bg-green-50"
          : "border-yellow-300 bg-yellow-50"
      }`}
    >
      <h4 className="font-semibold mb-2">{title}</h4>
      <div className="max-h-60 overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left">Account ID</th>
              {type === "existing" && <th>Name</th>}
            </tr>
          </thead>
          <tbody>
            {data.map((c) => (
              <tr key={c.accountId}>
                <td>{c.accountId}</td>
                {type === "existing" && <td>{c.name}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PrimaryButton({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      className="bg-pink-600 hover:bg-pink-700 text-white px-6 py-3 rounded-xl font-semibold"
    >
      {children}
    </button>
  );
}

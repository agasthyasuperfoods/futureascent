"use client";
import { useState } from "react";
import Papa from "papaparse";

/* 🔑 CONSTANT PREFIX */
const METCASH_PREFIX = "METCASH FOOD & GROCERY PTY LTD - ";

export default function Createcustomers() {
  const [step, setStep] = useState(1);
  const [rows, setRows] = useState([]);
  const [existing, setExisting] = useState([]);
  const [missing, setMissing] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState("");

  /* ===============================
     STEP 1 — UPLOAD & PARSE CSV
     =============================== */
  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
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
            retailerName: retailerName
              ? `${METCASH_PREFIX}${retailerName.trim()}`
              : "",
          });
        });

        setRows(parsed);
        setStep(2);
      },
    });
  }

  /* ===============================
     STEP 2 — CHECK CUSTOMERS IN XERO
     =============================== */
  async function checkCustomers() {
    setLoading(true);

    const uniqueIds = [...new Set(rows.map((r) => r.customerId))];
    const exist = [];
    const miss = [];

    for (const id of uniqueIds) {
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
        const row = rows.find((r) => r.customerId === id);
        miss.push({
          accountId: id,
          name: row?.retailerName || "",
        });
      }
    }

    setExisting(exist);
    setMissing(miss);
    setLoading(false);
    setStep(3);
  }

  /* ===============================
     STEP 3 — CREATE CUSTOMERS
     =============================== */
  function createCustomers() {
    alert(`Create ${missing.length} new customers in Xero`);
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        {/* HEADER */}
        <div style={styles.header}>
          <h2>Create Customers (Xero)</h2>
          <span style={styles.back} onClick={() => window.history.back()}>
            ← Back
          </span>
        </div>

        {/* STEPPER */}
        <div style={styles.stepper}>
          {["Upload CSV", "Check Customers", "Review"].map((label, i) => (
            <div key={i} style={styles.step}>
              <div
                style={{
                  ...styles.circle,
                  background: step >= i + 1 ? "#ec4899" : "#cbd5e1",
                }}
              >
                {i + 1}
              </div>
              <span>{label}</span>
            </div>
          ))}
        </div>

        <div style={styles.card}>

          {/* STEP 1 */}
          {step === 1 && (
            <>
              <h3>Upload CSV</h3>
              <div style={styles.uploadBox}>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFile}
                  style={styles.fileInput}
                />
                <p><b>Click to upload</b> or drag CSV here</p>
                {fileName && <span style={styles.fileName}>{fileName}</span>}
              </div>
            </>
          )}

          {/* STEP 2 — COUNT ONLY */}
          {step === 2 && (
            <>
              <h3>Check Customers</h3>
              <p>
                Rows parsed: <b>{rows.length}</b>
              </p>

              <button style={styles.primaryBtn} onClick={checkCustomers}>
                Check Customers in Xero
              </button>
            </>
          )}

          {/* STEP 3 — REVIEW */}
          {step === 3 && (
            <>
              <div style={styles.stats}>
                <Stat title="Total" value={existing.length + missing.length} />
                <Stat title="Existing" value={existing.length} />
                <Stat title="New" value={missing.length} />
              </div>

              <div style={styles.tables}>
                {/* EXISTING */}
                <div style={styles.existingBox}>
                  <h4>Existing Customers</h4>
                  <div style={styles.tableWrap}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Account ID</th>
                          <th style={styles.th}>Customer Name</th>
                        </tr>
                      </thead>
                      <tbody>
                        {existing.map((c) => (
                          <tr key={c.accountId}>
                            <td style={styles.tdId}>{c.accountId}</td>
                            <td style={styles.tdName}>{c.name}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* NEW */}
                <div style={styles.newBox}>
                  <h4>New Customers</h4>
                  <div style={styles.tableWrap}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Account ID</th>
                          <th style={styles.th}>Customer Name</th>
                        </tr>
                      </thead>
                      <tbody>
                        {missing.map((c) => (
                          <tr key={c.accountId}>
                            <td style={styles.tdId}>{c.accountId}</td>
                            <td style={styles.tdName}>{c.name}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {missing.length > 0 && (
                    <button style={styles.createBtn} onClick={createCustomers}>
                      Create New Customers
                    </button>
                  )}
                </div>
              </div>
            </>
          )}

          {loading && <p>⏳ Checking customers…</p>}
        </div>
      </div>
    </div>
  );
}

/* ===============================
   SMALL COMPONENT
   =============================== */
function Stat({ title, value }) {
  return (
    <div style={styles.statCard}>
      <h3>{value}</h3>
      <p>{title}</p>
    </div>
  );
}

/* ===============================
   STYLES (UNCHANGED)
   =============================== */
const styles = {
  page: {
    minHeight: "100vh",
    background: "#fff7fb",
    display: "flex",
    justifyContent: "center",
    paddingTop: 40,
  },
  container: { width: "100%", maxWidth: 1100 },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  back: { cursor: "pointer", color: "#a855f7" },
  stepper: { display: "flex", justifyContent: "space-between", marginBottom: 20 },
  step: { display: "flex", alignItems: "center", gap: 8 },
  circle: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "bold",
  },
  card: {
    background: "#fff",
    padding: 30,
    borderRadius: 14,
    boxShadow: "0 10px 30px rgba(0,0,0,.08)",
  },
  uploadBox: {
    border: "2px dashed #d8b4fe",
    padding: 40,
    borderRadius: 12,
    textAlign: "center",
    position: "relative",
  },
  fileInput: { position: "absolute", inset: 0, opacity: 0, cursor: "pointer" },
  fileName: { marginTop: 10, display: "block", color: "#ec4899" },
  primaryBtn: {
    marginTop: 16,
    padding: "12px 20px",
    background: "#ec4899",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
  },
  stats: { display: "flex", gap: 20, marginBottom: 20 },
  statCard: {
    flex: 1,
    background: "#faf5ff",
    padding: 20,
    borderRadius: 10,
    textAlign: "center",
  },
  tables: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 },
  existingBox: {
    background: "#ecfdf5",
    border: "1px solid #86efac",
    padding: 16,
    borderRadius: 12,
  },
  newBox: {
    background: "#fffbeb",
    border: "1px solid #fde68a",
    padding: 16,
    borderRadius: 12,
  },
  tableWrap: { maxHeight: 260, overflowY: "auto", marginTop: 8 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 14 },
  th: {
    textAlign: "left",
    padding: "8px 6px",
    fontWeight: 600,
    background: "#f1f5f9",
  },
  tdId: { padding: "8px 6px", fontWeight: 500, width: 120 },
  tdName: { padding: "8px 6px", lineHeight: 1.4 },
  createBtn: {
    marginTop: 14,
    width: "100%",
    padding: "12px",
    background: "#ec4899",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    fontWeight: 600,
    cursor: "pointer",
  },
};

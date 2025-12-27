import { useState } from "react";
import Papa from "papaparse";

export default function UploadCSV() {
  const [step, setStep] = useState(1);
  const [rows, setRows] = useState([]);
  const [existing, setExisting] = useState([]);
  const [missing, setMissing] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState("");

  /* STEP 1 — Parse CSV */
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

          if (!customerId) return;

          parsed.push({ customerId: customerId.trim() });
        });

        setRows(parsed);
        setStep(2);
      },
    });
  }

  /* STEP 2 — Check customers (API already working) */
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
        miss.push(id);
      }
    }

    setExisting(exist);
    setMissing(miss);
    setLoading(false);
    setStep(3);
  }

  /* STEP 3 — UI ONLY (create later) */
  function createNewCustomersUI() {
    alert(`Create ${missing.length} new customers (API will be connected later)`);
    console.log("New customers:", missing);
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        {/* STEPPER */}
        <div style={styles.stepper}>
          {["Upload CSV", "Check Customers", "Review"].map((label, i) => (
            <div key={i} style={styles.step}>
              <div
                style={{
                  ...styles.circle,
                  background: step >= i + 1 ? "#2563eb" : "#cbd5e1",
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
              <h2>Upload CSV</h2>
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

          {/* STEP 2 */}
          {step === 2 && (
            <>
              <h2>Check Customers</h2>
              <p>Rows parsed: <b>{rows.length}</b></p>

              <button style={styles.primaryBtn} onClick={checkCustomers}>
                Check Customers in Xero
              </button>
            </>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <>
              <h2>Customer Summary</h2>

              <div style={styles.stats}>
                <Stat title="Total Customers" value={existing.length + missing.length} />
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
                          <th>Account ID</th>
                          <th>Name</th>
                        </tr>
                      </thead>
                      <tbody>
                        {existing.map((c) => (
                          <tr key={c.accountId}>
                            <td>{c.accountId}</td>
                            <td>{c.name}</td>
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
                          <th>Account ID</th>
                        </tr>
                      </thead>
                      <tbody>
                        {missing.map((id) => (
                          <tr key={id}>
                            <td>{id}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {missing.length > 0 && (
                    <button
                      style={styles.createBtn}
                      onClick={createNewCustomersUI}
                    >
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

/* SMALL COMPONENT */
function Stat({ title, value }) {
  return (
    <div style={styles.statCard}>
      <h3>{value}</h3>
      <p>{title}</p>
    </div>
  );
}

/* STYLES */
const styles = {
  page: {
    minHeight: "100vh",
    background: "#f1f5f9",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    width: "100%",
    maxWidth: 1000,
  },
  stepper: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  step: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
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
    borderRadius: 12,
    boxShadow: "0 10px 30px rgba(0,0,0,.1)",
  },
  uploadBox: {
    border: "2px dashed #94a3b8",
    padding: 40,
    borderRadius: 10,
    textAlign: "center",
    position: "relative",
  },
  fileInput: {
    position: "absolute",
    inset: 0,
    opacity: 0,
    cursor: "pointer",
  },
  fileName: {
    display: "block",
    marginTop: 10,
    color: "#2563eb",
  },
  primaryBtn: {
    padding: "12px 20px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
  },
  stats: {
    display: "flex",
    gap: 20,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    background: "#f8fafc",
    padding: 20,
    borderRadius: 8,
    textAlign: "center",
  },
  tables: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 20,
  },
  existingBox: {
    background: "#ecfdf5",
    border: "1px solid #86efac",
    padding: 16,
    borderRadius: 10,
  },
  newBox: {
    background: "#fffbeb",
    border: "1px solid #fde68a",
    padding: 16,
    borderRadius: 10,
  },
  tableWrap: {
    maxHeight: 260,
    overflow: "auto",
    marginTop: 10,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  createBtn: {
    marginTop: 12,
    width: "100%",
    padding: "12px",
    background: "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
  },
};

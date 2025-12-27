import Papa from "papaparse";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const buffers = [];
  for await (const chunk of req) buffers.push(chunk);

  const csv = Buffer.concat(buffers).toString("utf8");

  const parsed = Papa.parse(csv, {
    header: true,
    skipEmptyLines: true,
  });

  const rows = [];

  for (const row of parsed.data) {
    const customerId =
      row["Customer ID"] ||
      row["customer_id"] ||
      row["CustomerID"] ||
      row["Account ID"] ||
      row["AccountID"];

    if (!customerId) {
      console.warn("Skipping row (no account id):", row);
      continue;
    }

    rows.push({
      customerId,
      orderNumber: row["Order Number"],
      product: row["Product Name"],
      qty: row["Ordered Qty"],
    });
  }

  res.json({
    totalRows: parsed.data.length,
    validRows: rows.length,
    rows,
  });
}

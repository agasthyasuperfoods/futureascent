import { query } from "../../../lib/db";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: "name required" });
    }

    const result = await query(
      `
      SELECT
        account_id,
        name,
        address_line1,
        city,
        region,
        postal_code,
        country
      FROM customers
      WHERE LOWER(name) = LOWER($1)
      LIMIT 1
      `,
      [name]
    );

    if (result.rows.length === 0) {
      return res.json({ found: false });
    }

    return res.json({
      found: true,
      customer: result.rows[0],
    });

  } catch (err) {
    console.error("LOOKUP ERROR:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

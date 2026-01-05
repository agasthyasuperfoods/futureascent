import { query } from "../../../lib/db";

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
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
        country,
        source,
        is_active,
        created_at,
        updated_at
      FROM customers
      ORDER BY created_at DESC
      `,
      []
    );

    return res.status(200).json({
      retailers: result.rows,
    });

  } catch (err) {
    console.error("RETAILERS LIST ERROR:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

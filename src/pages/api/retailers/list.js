import { Pool } from "pg";

/* 🔐 DB CONNECTION */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // required for Neon / Supabase
});

export default async function handler(req, res) {
  try {
    const query = `
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
    `;

    const { rows } = await pool.query(query);

    res.status(200).json({
      retailers: rows,
    });
  } catch (error) {
    console.error("Retailers fetch error:", error);
    res.status(500).json({
      error: "Failed to fetch retailers",
    });
  }
}

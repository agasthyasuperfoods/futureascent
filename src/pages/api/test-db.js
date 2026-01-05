import { query } from "../../lib/db";

export default async function handler(req, res) {
  const result = await query("SELECT 1 AS ok");
  res.json(result.rows);
}

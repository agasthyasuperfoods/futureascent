import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const sql = neon(process.env.DATABASE_URL);

export async function query(text, params = []) {
  const result = await sql.query(text, params);

  // ✅ NORMALIZE RESULT SHAPE
  if (Array.isArray(result)) {
    return { rows: result };
  }

  if (result && Array.isArray(result.rows)) {
    return result;
  }

  return { rows: [] };
}

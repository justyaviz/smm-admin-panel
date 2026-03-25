import pg from "pg";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.DATABASE_URL &&
    (process.env.DATABASE_URL.includes("railway.app") ||
      process.env.DATABASE_URL.includes("proxy.rlwy.net"))
      ? { rejectUnauthorized: false }
      : false
});

export async function query(text, params = []) {
  return pool.query(text, params);
}

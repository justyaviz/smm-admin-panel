import "dotenv/config";
import pkg from "pg";

const { Pool } = pkg;
const connectionString = process.env.DATABASE_URL?.trim() || undefined;
const connectionTimeoutMillis = Number(process.env.DB_CONNECT_TIMEOUT_MS || 10000);

const pool = new Pool({
  connectionString,
  ssl: connectionString ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis
});

export const query = (text, params) => pool.query(text, params);
export const getClient = () => pool.connect();

export default pool;

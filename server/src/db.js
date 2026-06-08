import "dotenv/config";
import pkg from "pg";

const { Pool } = pkg;
const dbSources = [
  ["DATABASE_URL", process.env.DATABASE_URL],
  ["POSTGRES_URL", process.env.POSTGRES_URL],
  ["DATABASE_PUBLIC_URL", process.env.DATABASE_PUBLIC_URL],
  ["DATABASE_PRIVATE_URL", process.env.DATABASE_PRIVATE_URL]
];
const [connectionSource, rawConnectionString] =
  dbSources.find(([, value]) => String(value || "").trim()) || [null, ""];
const connectionString = String(rawConnectionString || "").trim() || undefined;
const connectionTimeoutMillis = Number(process.env.DB_CONNECT_TIMEOUT_MS || 10000);

function parseConnectionInfo(value) {
  try {
    const url = new URL(value);
    return {
      host: url.hostname,
      port: url.port,
      database: url.pathname.replace(/^\//, "")
    };
  } catch {
    return {
      host: process.env.PGHOST || "",
      port: process.env.PGPORT || "",
      database: process.env.PGDATABASE || ""
    };
  }
}

const connectionInfo = parseConnectionInfo(connectionString || "");
const isLocalHost = ["localhost", "127.0.0.1", "::1"].includes(connectionInfo.host);
const dbSslEnv = String(process.env.DB_SSL || "").trim().toLowerCase();
const sslEnabled = dbSslEnv
  ? !["0", "false", "off", "no"].includes(dbSslEnv)
  : Boolean(connectionString && !isLocalHost);

const pool = new Pool({
  connectionString,
  ssl: sslEnabled ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis
});

export const query = (text, params) => pool.query(text, params);
export const getClient = () => pool.connect();
export const getDatabaseStatus = () => ({
  configured: Boolean(connectionString || process.env.PGHOST),
  source: connectionSource || (process.env.PGHOST ? "PGHOST" : null),
  host: connectionInfo.host || process.env.PGHOST || null,
  port: connectionInfo.port || process.env.PGPORT || null,
  database: connectionInfo.database || process.env.PGDATABASE || null,
  ssl: sslEnabled,
  timeout_ms: connectionTimeoutMillis
});

export default pool;

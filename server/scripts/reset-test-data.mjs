import "dotenv/config";
import bcrypt from "bcryptjs";
import pkg from "pg";

const { Pool } = pkg;

const connectionString = process.env.DATABASE_URL?.trim();

if (!connectionString) {
  console.error("DATABASE_URL topilmadi. Avval server/.env faylida DATABASE_URL ni kiriting.");
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: Number(process.env.DB_CONNECT_TIMEOUT_MS || 10000)
});

const ADMIN_ONLY_RESET_VERSION = "2026-06-08-admin-only-998931949200-v2";
const ADMIN_ONLY_RESET_FLAG_KEY = "admin_only_reset_version";
const DEFAULT_ADMIN_PHONE = "998931949200";
const DEFAULT_ADMIN_PASSWORD = "2000";
const DEFAULT_ADMIN_LOGIN = "admin";
const DEFAULT_ADMIN_NAME = "Asosiy administrator";
const ADMIN_PERMISSIONS = [
  "dashboard",
  "managerLab",
  "content",
  "content_create",
  "content_edit",
  "content_delete",
  "campaigns",
  "campaigns_edit",
  "campaigns_delete",
  "analytics",
  "dailyReports",
  "dailyReports_edit",
  "dailyReports_delete",
  "uploads",
  "uploads_create",
  "uploads_delete",
  "users",
  "users_edit",
  "users_delete",
  "tasks",
  "tasks_edit",
  "tasks_delete",
  "profile",
  "settings",
  "audit"
];

async function main() {
  const client = await pool.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS system_flags (
        flag_key TEXT PRIMARY KEY,
        flag_value TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const existingRes = await client.query(
      `
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename <> ALL($1)
      ORDER BY tablename ASC
      `,
      [["app_settings", "system_flags"]]
    );
    const existingTables = existingRes.rows.map((row) => row.tablename);

    const adminPasswordHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);

    await client.query("BEGIN");
    if (existingTables.length) {
      await client.query(
        `TRUNCATE TABLE ${existingTables.map((tableName) => `"${tableName}"`).join(", ")} RESTART IDENTITY CASCADE`
      );
    }
    await client.query(
      `
      INSERT INTO users (
        full_name,
        phone,
        login,
        password_hash,
        role,
        department_role,
        permissions_json,
        is_active
      )
      VALUES ($1,$2,$3,$4,'admin','Administrator',$5::jsonb,TRUE)
      `,
      [
        DEFAULT_ADMIN_NAME,
        DEFAULT_ADMIN_PHONE,
        DEFAULT_ADMIN_LOGIN,
        adminPasswordHash,
        JSON.stringify(ADMIN_PERMISSIONS)
      ]
    );
    await client.query(
      `
      INSERT INTO system_flags (flag_key, flag_value)
      VALUES ($1,$2)
      ON CONFLICT (flag_key)
      DO UPDATE SET flag_value = EXCLUDED.flag_value, updated_at = CURRENT_TIMESTAMP
      `,
      [ADMIN_ONLY_RESET_FLAG_KEY, ADMIN_ONLY_RESET_VERSION]
    );
    await client.query("COMMIT");

    console.log("Quyidagi jadvallar tozalandi:");
    existingTables.forEach((tableName) => console.log(`- ${tableName}`));
    console.log("");
    console.log("Qoldirildi:");
    console.log("- app_settings");
    console.log("- system_flags");
    console.log(`- users: ${DEFAULT_ADMIN_PHONE} / ${DEFAULT_ADMIN_PASSWORD}`);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Reset paytida xatolik:", error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();

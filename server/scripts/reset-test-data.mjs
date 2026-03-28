import "dotenv/config";
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

const candidateTables = [
  "typing_states",
  "monthly_snapshots",
  "team_mood_entries",
  "comments",
  "messages",
  "notifications",
  "audit_logs",
  "uploads",
  "bonus_items",
  "bonuses",
  "daily_branch_reports",
  "campaigns",
  "tasks",
  "content_items",
  "expenses",
  "travel_plans",
  "recurring_tasks",
  "recurring_expenses",
  "budgets"
];

async function main() {
  const client = await pool.connect();

  try {
    const existingRes = await client.query(
      `
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename = ANY($1)
      `,
      [candidateTables]
    );

    const existingTables = candidateTables.filter((tableName) =>
      existingRes.rows.some((row) => row.tablename === tableName)
    );

    if (!existingTables.length) {
      console.log("Tozalanadigan jadval topilmadi.");
      return;
    }

    await client.query("BEGIN");
    await client.query(
      `TRUNCATE TABLE ${existingTables.map((tableName) => `"${tableName}"`).join(", ")} RESTART IDENTITY CASCADE`
    );
    await client.query("COMMIT");

    console.log("Quyidagi test jadvallar tozalandi:");
    existingTables.forEach((tableName) => console.log(`- ${tableName}`));
    console.log("");
    console.log("Saqlab qolindi:");
    console.log("- app_settings");
    console.log("- users");
    console.log("- branches");
    console.log("- social_accounts");
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

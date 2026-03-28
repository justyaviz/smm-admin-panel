import "dotenv/config";
import pkg from "pg";
import { DEFAULT_BRANCHES } from "../src/defaultBranches.js";

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

const dependentTables = [
  "content_items",
  "bonus_items",
  "daily_branch_reports",
  "travel_plans"
];

async function main() {
  const client = await pool.connect();

  try {
    const tableCheck = await client.query(
      `
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public' AND tablename = 'branches'
      `
    );

    if (!tableCheck.rows.length) {
      throw new Error("branches jadvali topilmadi");
    }

    const blockingTables = [];

    for (const tableName of dependentTables) {
      const existsRes = await client.query(
        `
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public' AND tablename = $1
        `,
        [tableName]
      );

      if (!existsRes.rows.length) continue;

      const countRes = await client.query(`SELECT COUNT(*)::int AS count FROM ${tableName}`);
      const rowCount = Number(countRes.rows[0]?.count || 0);

      if (rowCount > 0) {
        blockingTables.push(`${tableName}: ${rowCount} ta yozuv`);
      }
    }

    if (blockingTables.length) {
      throw new Error(
        `Filiallarni almashtirishdan oldin branchga bog'liq jadvallar bo'sh bo'lishi kerak:\n- ${blockingTables.join("\n- ")}`
      );
    }

    await client.query("BEGIN");
    await client.query("TRUNCATE TABLE branches RESTART IDENTITY CASCADE");

    for (const branch of DEFAULT_BRANCHES) {
      await client.query(
        `
        INSERT INTO branches (name, city)
        VALUES ($1, $2)
        `,
        [branch.name, branch.city]
      );
    }

    await client.query("COMMIT");

    console.log("Filiallar yangilandi:");
    DEFAULT_BRANCHES.forEach((branch, index) => {
      console.log(`${index + 1}. ${branch.name}`);
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Branch sync xatoligi:", error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();

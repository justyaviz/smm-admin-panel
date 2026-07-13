import { app } from './app.js';
import { env } from './config/env.js';
import { pool } from './db/pool.js';
import { bootstrapAdmin, migrateDatabase } from './db/migrate.js';

async function start() {
  await migrateDatabase();
  await bootstrapAdmin();

  const server = app.listen(env.port, '0.0.0.0', () => {
    console.log(`aloo SMM API 0.0.0.0:${env.port} da ishga tushdi`);
  });

  const shutdown = async (signal) => {
    console.log(`${signal} qabul qilindi, server yopilmoqda...`);
    server.close(async () => {
      await pool.end().catch(() => {});
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch(async (error) => {
  console.error('Server ishga tushmadi:', error);
  await pool.end().catch(() => {});
  process.exit(1);
});

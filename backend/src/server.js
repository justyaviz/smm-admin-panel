import { app } from './app.js';
import { env } from './config/env.js';
import { pool } from './db/pool.js';
import { bootstrapAdmin, migrateDatabase } from './db/migrate.js';
import { runtime } from './runtime.js';

const RETRY_DELAY_MS = 5_000;

async function initializeDatabase() {
  if (!env.databaseUrl) {
    runtime.initializationError = 'DATABASE_URL belgilanmagan.';
    console.warn(runtime.initializationError);
    return;
  }

  let attempt = 0;
  while (!runtime.initializationComplete) {
    attempt += 1;
    try {
      console.log(`Database initialization urinishi: ${attempt}`);
      await migrateDatabase();
      await bootstrapAdmin();
      runtime.databaseReady = true;
      runtime.initializationComplete = true;
      runtime.initializationError = null;
      console.log('PostgreSQL migratsiyasi va admin bootstrap muvaffaqiyatli yakunlandi.');
    } catch (error) {
      runtime.databaseReady = false;
      runtime.initializationError = error?.message || String(error);
      console.error(`Database initialization xatosi (${attempt}):`, runtime.initializationError);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
}

function start() {
  // Port avval ochiladi — Railway healthcheck migratsiyani kutib qolmaydi.
  const server = app.listen(env.port, '0.0.0.0', () => {
    console.log(`aloo SMM API 0.0.0.0:${env.port} da ishga tushdi`);
    void initializeDatabase();
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

start();

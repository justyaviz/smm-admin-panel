import pg from 'pg';
import { env } from '../config/env.js';

const { Pool } = pg;

const poolOptions = {
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
};

if (env.databaseUrl) {
  poolOptions.connectionString = env.databaseUrl;
  poolOptions.ssl = env.isProduction ? { rejectUnauthorized: false } : false;
}

export const pool = new Pool(poolOptions);

pool.on('error', (error) => {
  console.error('PostgreSQL pool error:', error.message);
});

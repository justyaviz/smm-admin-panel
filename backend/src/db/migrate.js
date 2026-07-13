import bcrypt from 'bcryptjs';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { pool } from './pool.js';
import { env } from '../config/env.js';

const schemaPath = fileURLToPath(new URL('../../sql/schema.sql', import.meta.url));

export async function migrateDatabase() {
  const schema = await readFile(schemaPath, 'utf8');
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock($1)', [73190412]);
    await client.query(schema);
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [73190412]).catch(() => {});
    client.release();
  }
}

export async function bootstrapAdmin() {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM app_users');
  if (rows[0].count > 0) return;

  if (!env.admin.login || !env.admin.password) {
    console.warn('Birinchi admin yaratilmadi: ADMIN_LOGIN va ADMIN_PASSWORD belgilanmagan.');
    return;
  }

  if (env.isProduction && env.admin.password.length < 10) {
    throw new Error('Production ADMIN_PASSWORD kamida 10 ta belgidan iborat bo‘lishi kerak.');
  }

  const passwordHash = await bcrypt.hash(env.admin.password, 12);
  await pool.query(
    `INSERT INTO app_users (full_name, login, phone, password_hash, role)
     VALUES ($1, $2, $3, $4, 'admin')`,
    [env.admin.fullName, env.admin.login.toLowerCase(), env.admin.phone, passwordHash],
  );
  console.log(`Birinchi admin yaratildi: ${env.admin.login}`);
}

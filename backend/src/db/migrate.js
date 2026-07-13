import bcrypt from 'bcryptjs';
import { pool } from './pool.js';
import { env } from '../config/env.js';

const schema = `
CREATE TABLE IF NOT EXISTS app_users (
  id BIGSERIAL PRIMARY KEY,
  full_name VARCHAR(160) NOT NULL,
  login VARCHAR(80) NOT NULL UNIQUE,
  phone VARCHAR(32) UNIQUE,
  password_hash TEXT NOT NULL,
  role VARCHAR(40) NOT NULL DEFAULT 'smm_manager',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_users_phone ON app_users(phone);
CREATE INDEX IF NOT EXISTS idx_app_users_active ON app_users(is_active);

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES app_users(id) ON DELETE SET NULL,
  action VARCHAR(120) NOT NULL,
  ip_address VARCHAR(80),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

export async function migrateDatabase() {
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock($1)', [73190412]);
    await client.query('BEGIN');
    await client.query(schema);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
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

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
  const login = env.admin.login.trim().toLowerCase();
  const password = env.admin.password;

  if (!login || !password) {
    throw new Error('ADMIN_LOGIN va ADMIN_PASSWORD bo‘sh bo‘lishi mumkin emas.');
  }

  if (password.length < 6) {
    throw new Error('ADMIN_PASSWORD kamida 6 ta belgidan iborat bo‘lishi kerak.');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const existing = await client.query(
      'SELECT id FROM app_users WHERE LOWER(login) = $1 LIMIT 1 FOR UPDATE',
      [login],
    );

    let adminId;
    if (existing.rows[0]) {
      adminId = existing.rows[0].id;
      await client.query(
        `UPDATE app_users
         SET full_name = $1,
             phone = COALESCE($2, phone),
             password_hash = $3,
             role = 'admin',
             is_active = TRUE,
             updated_at = NOW()
         WHERE id = $4`,
        [env.admin.fullName, env.admin.phone, passwordHash, adminId],
      );
      console.log(`Admin ma’lumotlari yangilandi: ${login}`);
    } else {
      const inserted = await client.query(
        `INSERT INTO app_users (full_name, login, phone, password_hash, role, is_active)
         VALUES ($1, $2, $3, $4, 'admin', TRUE)
         RETURNING id`,
        [env.admin.fullName, login, env.admin.phone, passwordHash],
      );
      adminId = inserted.rows[0].id;
      console.log(`Birinchi admin yaratildi: ${login}`);
    }

    await client.query(
      `INSERT INTO media_folders (name,description,color,created_by) VALUES
        ('Aksiyalar','Aksiya va promo materiallari','#1690F5',$1),
        ('Mahsulotlar','Mahsulot rasmlari va videolari','#12B76A',$1),
        ('Filiallar','Filiallardan kelgan media fayllar','#F79009',$1),
        ('Reels cover','Instagram Reels muqovalari','#E4405F',$1),
        ('Brend materiallari','Logo, guideline va shablonlar','#6941C6',$1)
       ON CONFLICT DO NOTHING`,
      [adminId],
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { env } from '../config/env.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();
const loginSchema = z.object({
  identifier: z.string().trim().min(2).max(100),
  password: z.string().min(6).max(200),
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Juda ko‘p kirish urinishlari. 15 daqiqadan keyin qayta urinib ko‘ring.' },
});

async function permissionsFor(role) {
  if (role === 'admin') {
    const { rows } = await pool.query('SELECT code FROM permissions ORDER BY sort_order, code');
    return rows.map((row) => row.code);
  }
  const { rows } = await pool.query(
    'SELECT permission_code AS code FROM role_permissions WHERE role_code = $1 ORDER BY permission_code',
    [role],
  );
  return rows.map((row) => row.code);
}

async function branchesFor(userId) {
  const { rows } = await pool.query(
    `SELECT b.id, b.code, b.name, ub.is_primary
     FROM app_user_branches ub
     JOIN branches b ON b.id = ub.branch_id
     WHERE ub.user_id = $1
     ORDER BY ub.is_primary DESC, b.sort_order, b.name`,
    [userId],
  );
  return rows.map((row) => ({ id: Number(row.id), code: row.code, name: row.name, isPrimary: row.is_primary }));
}

async function publicUser(user) {
  return {
    id: Number(user.id),
    fullName: user.full_name,
    login: user.login,
    phone: user.phone,
    email: user.email || null,
    jobTitle: user.job_title || '',
    avatarUrl: user.avatar_url || null,
    telegramUsername: user.telegram_username || null,
    role: user.role,
    isActive: user.is_active,
    lastLoginAt: user.last_login_at || null,
    permissions: user.permissions || await permissionsFor(user.role),
    branches: await branchesFor(user.id),
  };
}

router.post('/login', loginLimiter, async (request, response, next) => {
  try {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return response.status(400).json({ message: 'Login va parol formatini tekshiring.' });
    }

    const identifier = parsed.data.identifier.toLowerCase();
    const { rows } = await pool.query(
      `SELECT id, full_name, login, phone, email, job_title, avatar_url, telegram_username,
              password_hash, role, is_active, last_login_at
       FROM app_users
       WHERE LOWER(login) = $1 OR phone = $2 OR LOWER(COALESCE(email,'')) = $1
       LIMIT 1`,
      [identifier, parsed.data.identifier],
    );
    const user = rows[0];
    if (!user || !user.is_active || !(await bcrypt.compare(parsed.data.password, user.password_hash))) {
      return response.status(401).json({ message: 'Login yoki parol noto‘g‘ri.' });
    }

    await pool.query('UPDATE app_users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1', [user.id]);
    user.last_login_at = new Date().toISOString();
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, ip_address, metadata)
       VALUES ($1, 'auth.login', $2, $3::jsonb)`,
      [user.id, request.ip, JSON.stringify({ userAgent: request.get('user-agent') || null })],
    );

    const token = jwt.sign(
      { sub: String(user.id), role: user.role },
      env.jwtSecret,
      { expiresIn: env.jwtExpiresIn, issuer: 'aloosmm-api', audience: 'aloosmm-web' },
    );

    return response.json({ token, user: await publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

router.get('/me', authRequired, async (request, response, next) => {
  try {
    response.json({ user: await publicUser(request.user) });
  } catch (error) {
    next(error);
  }
});

export default router;

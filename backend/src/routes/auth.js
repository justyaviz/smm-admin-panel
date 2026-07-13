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

function publicUser(user) {
  return {
    id: user.id,
    fullName: user.full_name,
    login: user.login,
    phone: user.phone,
    role: user.role,
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
      `SELECT id, full_name, login, phone, password_hash, role, is_active
       FROM app_users
       WHERE LOWER(login) = $1 OR phone = $2
       LIMIT 1`,
      [identifier, parsed.data.identifier],
    );
    const user = rows[0];
    if (!user || !user.is_active || !(await bcrypt.compare(parsed.data.password, user.password_hash))) {
      return response.status(401).json({ message: 'Login yoki parol noto‘g‘ri.' });
    }

    await pool.query('UPDATE app_users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1', [user.id]);
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

    return response.json({ token, user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

router.get('/me', authRequired, (request, response) => {
  response.json({ user: publicUser(request.user) });
});

export default router;

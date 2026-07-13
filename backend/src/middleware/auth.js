import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { pool } from '../db/pool.js';

async function loadPermissions(role) {
  if (role === 'admin') {
    const { rows } = await pool.query('SELECT code FROM permissions ORDER BY sort_order, code');
    return rows.map((row) => row.code);
  }
  const { rows } = await pool.query(
    `SELECT permission_code AS code
     FROM role_permissions
     WHERE role_code = $1
     ORDER BY permission_code`,
    [role],
  );
  return rows.map((row) => row.code);
}

export async function authRequired(request, response, next) {
  try {
    const authorization = request.headers.authorization || '';
    const [scheme, token] = authorization.split(' ');
    if (scheme !== 'Bearer' || !token) {
      return response.status(401).json({ message: 'Avtorizatsiya tokeni topilmadi.' });
    }

    const payload = jwt.verify(token, env.jwtSecret, {
      issuer: 'aloosmm-api',
      audience: 'aloosmm-web',
    });
    const { rows } = await pool.query(
      `SELECT id, full_name, login, phone, email, job_title, avatar_url,
              telegram_username, role, is_active, last_login_at
       FROM app_users WHERE id = $1 LIMIT 1`,
      [payload.sub],
    );
    const user = rows[0];
    if (!user || !user.is_active) {
      return response.status(401).json({ message: 'Foydalanuvchi faol emas.' });
    }

    user.permissions = await loadPermissions(user.role);
    request.user = user;
    return next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return response.status(401).json({ message: 'Sessiya muddati tugagan. Qayta kiring.' });
    }
    return response.status(401).json({ message: 'Token yaroqsiz.' });
  }
}

export function permissionRequired(...requiredPermissions) {
  return (request, response, next) => {
    if (!request.user) return response.status(401).json({ message: 'Avtorizatsiya talab qilinadi.' });
    if (request.user.role === 'admin') return next();
    const granted = new Set(request.user.permissions || []);
    const allowed = requiredPermissions.some((permission) => granted.has(permission));
    if (!allowed) {
      return response.status(403).json({ message: 'Bu amal uchun ruxsatingiz yetarli emas.' });
    }
    return next();
  };
}

export function adminOnly(request, response, next) {
  if (request.user?.role !== 'admin') {
    return response.status(403).json({ message: 'Bu amal faqat administrator uchun.' });
  }
  return next();
}

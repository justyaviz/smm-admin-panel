import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { pool } from '../db/pool.js';

export async function authRequired(request, response, next) {
  try {
    const authorization = request.headers.authorization || '';
    const [scheme, token] = authorization.split(' ');
    if (scheme !== 'Bearer' || !token) {
      return response.status(401).json({ message: 'Avtorizatsiya tokeni topilmadi.' });
    }

    const payload = jwt.verify(token, env.jwtSecret);
    const { rows } = await pool.query(
      `SELECT id, full_name, login, phone, role, is_active
       FROM app_users WHERE id = $1 LIMIT 1`,
      [payload.sub],
    );
    const user = rows[0];
    if (!user || !user.is_active) {
      return response.status(401).json({ message: 'Foydalanuvchi faol emas.' });
    }

    request.user = user;
    return next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return response.status(401).json({ message: 'Sessiya muddati tugagan. Qayta kiring.' });
    }
    return response.status(401).json({ message: 'Token yaroqsiz.' });
  }
}

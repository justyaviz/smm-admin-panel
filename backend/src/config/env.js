import 'dotenv/config';

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} environment variable is required`);
  return value;
}

const jwtSecret = process.env.JWT_SECRET || (isProduction ? required('JWT_SECRET') : 'development-secret-change-me-123456789');
if (jwtSecret.length < 32) {
  console.warn('JWT_SECRET 32 ta belgidan qisqa. Production uchun uzunroq maxfiy kalit ishlating.');
}

export const env = Object.freeze({
  nodeEnv,
  isProduction,
  port: Number(process.env.PORT || 3000),
  databaseUrl: required('DATABASE_URL'),
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '12h',
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean),
  admin: {
    fullName: process.env.ADMIN_FULL_NAME || 'Aloo Admin',
    login: process.env.ADMIN_LOGIN || (!isProduction ? 'admin' : ''),
    phone: process.env.ADMIN_PHONE || null,
    password: process.env.ADMIN_PASSWORD || (!isProduction ? 'aloo2026' : ''),
  },
});

import 'dotenv/config';
import { randomBytes } from 'node:crypto';

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';
const generatedJwtSecret = randomBytes(48).toString('hex');
const jwtSecret = process.env.JWT_SECRET || (isProduction ? generatedJwtSecret : 'development-secret-change-me-123456789');

if (!process.env.DATABASE_URL) {
  console.warn('DATABASE_URL belgilanmagan. Server healthcheck uchun ishga tushadi, ammo database funksiyalari tayyor bo‘lmaydi.');
}

if (!process.env.JWT_SECRET && isProduction) {
  console.warn('JWT_SECRET belgilanmagan. Vaqtinchalik tasodifiy kalit yaratildi; production Variables ichida doimiy JWT_SECRET kiriting.');
} else if (jwtSecret.length < 32) {
  console.warn('JWT_SECRET 32 ta belgidan qisqa. Production uchun uzunroq maxfiy kalit ishlating.');
}

export const env = Object.freeze({
  nodeEnv,
  isProduction,
  port: Number(process.env.PORT || 3000),
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '12h',
  openAiApiKey: process.env.OPENAI_API_KEY || '',
  openAiModel: process.env.OPENAI_MODEL || 'gpt-5-mini',
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY || '',
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || '',
  vapidSubject: process.env.VAPID_SUBJECT || 'mailto:admin@aloosmm.uz',
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean),
  admin: {
    fullName: process.env.ADMIN_FULL_NAME || 'Aloo Admin',
    login: process.env.ADMIN_LOGIN || 'admin',
    phone: process.env.ADMIN_PHONE || null,
    password: process.env.ADMIN_PASSWORD || '123456',
  },
});

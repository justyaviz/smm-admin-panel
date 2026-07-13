import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { env } from './config/env.js';
import { pool } from './db/pool.js';
import authRoutes from './routes/auth.js';
import dashboardRoutes from './routes/dashboard.js';

export const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin(origin, callback) {
    if (!origin || env.corsOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('CORS_ORIGIN ushbu manzilga ruxsat bermaydi.'));
  },
  credentials: false,
}));
app.use(express.json({ limit: '200kb' }));
app.use(rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
}));

app.get('/', (_request, response) => {
  response.json({ name: 'aloo SMM API', status: 'ok' });
});

app.get('/health', async (_request, response) => {
  try {
    await pool.query('SELECT 1');
    response.json({ ok: true });
  } catch {
    response.status(503).json({ ok: false });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use((_request, response) => {
  response.status(404).json({ message: 'Endpoint topilmadi.' });
});

app.use((error, _request, response, _next) => {
  console.error(error);
  if (error.message?.startsWith('CORS_ORIGIN')) {
    return response.status(403).json({ message: error.message });
  }
  return response.status(500).json({ message: 'Serverda ichki xato yuz berdi.' });
});

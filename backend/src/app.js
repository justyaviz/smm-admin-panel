import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { env } from './config/env.js';
import { pool } from './db/pool.js';
import { runtime } from './runtime.js';
import authRoutes from './routes/auth.js';
import dashboardRoutes from './routes/dashboard.js';
import contentRoutes from './routes/content.js';
import calendarRoutes from './routes/calendar.js';
import metaRoutes from './routes/meta.js';
import campaignRoutes from './routes/campaigns.js';
import adRoutes from './routes/ads.js';
import analyticsRoutes from './routes/analytics.js';
import reportRoutes from './routes/reports.js';
import mediaRoutes from './routes/media.js';
import branchRoutes from './routes/branches.js';
import teamRoutes from './routes/team.js';
import roleRoutes from './routes/roles.js';

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
app.use(express.json({ limit: '48mb' }));
app.use(rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
}));

app.get('/', (_request, response) => {
  response.json({ name: 'aloo SMM API', status: 'ok' });
});

// Railway liveness healthcheck: database hali ulanmagan bo‘lsa ham 200 qaytaradi.
app.get('/health', (_request, response) => {
  response.status(200).json({
    ok: true,
    service: 'aloo-smm-backend',
    databaseConfigured: Boolean(env.databaseUrl),
    databaseReady: runtime.databaseReady,
    initializationComplete: runtime.initializationComplete,
    startedAt: runtime.startedAt,
  });
});

// Readiness endpoint: database va migratsiyalar tayyor bo‘lgandagina 200.
app.get('/ready', async (_request, response) => {
  if (!env.databaseUrl) {
    return response.status(503).json({ ok: false, message: 'DATABASE_URL belgilanmagan.' });
  }

  try {
    await pool.query('SELECT 1');
    return response.status(runtime.databaseReady ? 200 : 503).json({
      ok: runtime.databaseReady,
      initializationComplete: runtime.initializationComplete,
      error: runtime.initializationError,
    });
  } catch {
    return response.status(503).json({ ok: false, message: 'PostgreSQL bilan aloqa yo‘q.' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/meta', metaRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/ads', adRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/roles', roleRoutes);

app.use((_request, response) => {
  response.status(404).json({ message: 'Endpoint topilmadi.' });
});

app.use((error, _request, response, _next) => {
  console.error(error);
  if (error?.type === 'entity.too.large') {
    return response.status(413).json({ message: 'Yuklanayotgan ma’lumot hajmi juda katta.' });
  }
  if (error.message?.startsWith('CORS_ORIGIN')) {
    return response.status(403).json({ message: error.message });
  }
  return response.status(500).json({ message: 'Serverda ichki xato yuz berdi.' });
});

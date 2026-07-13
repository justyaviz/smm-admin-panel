import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { authRequired, permissionRequired } from '../middleware/auth.js';

const router = Router();
router.use(authRequired);

const nullableText = z.union([z.string().trim(), z.literal(''), z.null(), z.undefined()]).transform((value) => value || null);
const profileSchema = z.object({
  fullName: z.string().trim().min(2).max(160),
  phone: nullableText,
  email: z.union([z.string().trim().email(), z.literal(''), z.null(), z.undefined()]).transform((value) => value || null),
  jobTitle: z.string().trim().max(160).default(''),
  avatarUrl: z.union([z.string().trim().url(), z.literal(''), z.null(), z.undefined()]).transform((value) => value || null),
  telegramUsername: nullableText,
});
const passwordSchema = z.object({ currentPassword: z.string().min(6).max(200), newPassword: z.string().min(6).max(200) });
const preferencesSchema = z.object({
  language: z.enum(['uz', 'ru', 'en']).default('uz'),
  timezone: z.string().trim().min(2).max(100).default('Asia/Tashkent'),
  dateFormat: z.enum(['DD.MM.YYYY', 'YYYY-MM-DD']).default('DD.MM.YYYY'),
  compactMode: z.boolean().default(false),
  soundEnabled: z.boolean().default(true),
  desktopEnabled: z.boolean().default(true),
  chatNotifications: z.boolean().default(true),
  taskNotifications: z.boolean().default(true),
  contentNotifications: z.boolean().default(true),
  expenseNotifications: z.boolean().default(true),
  reportNotifications: z.boolean().default(true),
});
const companySchema = z.object({
  companyName: z.string().trim().min(2).max(160),
  domain: z.string().trim().max(180).default('aloosmm.uz'),
  supportPhone: z.string().trim().max(40).default(''),
  supportTelegram: z.string().trim().max(100).default(''),
  timezone: z.string().trim().min(2).max(100).default('Asia/Tashkent'),
  currency: z.string().trim().min(2).max(10).default('UZS'),
  brandColor: z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/).default('#1690F5'),
  defaultLanguage: z.enum(['uz', 'ru', 'en']).default('uz'),
});

const defaultPreferences = {
  language: 'uz', timezone: 'Asia/Tashkent', dateFormat: 'DD.MM.YYYY', compactMode: false,
  soundEnabled: true, desktopEnabled: true, chatNotifications: true, taskNotifications: true,
  contentNotifications: true, expenseNotifications: true, reportNotifications: true,
};
const defaultCompany = {
  companyName: 'aloo SMM Panel', domain: 'aloosmm.uz', supportPhone: '', supportTelegram: '',
  timezone: 'Asia/Tashkent', currency: 'UZS', brandColor: '#1690F5', defaultLanguage: 'uz',
};

router.get('/profile', async (request, response) => {
  response.json({ profile: {
    id: Number(request.user.id), fullName: request.user.full_name, login: request.user.login,
    phone: request.user.phone || '', email: request.user.email || '', jobTitle: request.user.job_title || '',
    avatarUrl: request.user.avatar_url || '', telegramUsername: request.user.telegram_username || '', role: request.user.role,
  } });
});

router.put('/profile', async (request, response, next) => {
  try {
    const parsed = profileSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ message: 'Profil ma’lumotlarini tekshiring.' });
    const data = parsed.data;
    const { rows } = await pool.query(
      `UPDATE app_users SET full_name=$1,phone=$2,email=$3,job_title=$4,avatar_url=$5,telegram_username=$6
       WHERE id=$7 RETURNING id,full_name,login,phone,email,job_title,avatar_url,telegram_username,role,is_active,last_login_at`,
      [data.fullName, data.phone, data.email?.toLowerCase() || null, data.jobTitle, data.avatarUrl, data.telegramUsername, request.user.id],
    );
    await pool.query(
      `INSERT INTO audit_logs(user_id,action,ip_address,metadata) VALUES($1,'settings.profile.update',$2,$3::jsonb)`,
      [request.user.id, request.ip, JSON.stringify({ fullName: data.fullName })],
    );
    const user = rows[0];
    response.json({ user: {
      id: Number(user.id), fullName: user.full_name, login: user.login, phone: user.phone,
      email: user.email, jobTitle: user.job_title, avatarUrl: user.avatar_url,
      telegramUsername: user.telegram_username, role: user.role, isActive: user.is_active,
      lastLoginAt: user.last_login_at, permissions: request.user.permissions,
    } });
  } catch (error) {
    if (error.code === '23505') return response.status(409).json({ message: 'Telefon yoki email boshqa foydalanuvchiga tegishli.' });
    next(error);
  }
});

router.put('/password', async (request, response, next) => {
  try {
    const parsed = passwordSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ message: 'Parollar kamida 6 ta belgidan iborat bo‘lsin.' });
    if (parsed.data.currentPassword === parsed.data.newPassword) return response.status(400).json({ message: 'Yangi parol eski paroldan farq qilishi kerak.' });
    const current = await pool.query('SELECT password_hash FROM app_users WHERE id=$1', [request.user.id]);
    if (!current.rows[0] || !(await bcrypt.compare(parsed.data.currentPassword, current.rows[0].password_hash))) {
      return response.status(400).json({ message: 'Joriy parol noto‘g‘ri.' });
    }
    const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
    await pool.query('UPDATE app_users SET password_hash=$1 WHERE id=$2', [passwordHash, request.user.id]);
    await pool.query(
      `INSERT INTO audit_logs(user_id,action,ip_address,metadata) VALUES($1,'settings.password.update',$2,'{}'::jsonb)`,
      [request.user.id, request.ip],
    );
    response.json({ ok: true });
  } catch (error) { next(error); }
});

router.get('/preferences', async (request, response, next) => {
  try {
    const { rows } = await pool.query('SELECT preferences FROM user_preferences WHERE user_id=$1', [request.user.id]);
    response.json({ preferences: { ...defaultPreferences, ...(rows[0]?.preferences || {}) } });
  } catch (error) { next(error); }
});

router.put('/preferences', async (request, response, next) => {
  try {
    const parsed = preferencesSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ message: 'Bildirishnoma va ko‘rinish sozlamalarini tekshiring.' });
    const { rows } = await pool.query(
      `INSERT INTO user_preferences(user_id,preferences) VALUES($1,$2::jsonb)
       ON CONFLICT(user_id) DO UPDATE SET preferences=EXCLUDED.preferences,updated_at=NOW()
       RETURNING preferences`,
      [request.user.id, JSON.stringify(parsed.data)],
    );
    response.json({ preferences: rows[0].preferences });
  } catch (error) { next(error); }
});

router.get('/company', permissionRequired('settings.manage'), async (_request, response, next) => {
  try {
    const { rows } = await pool.query("SELECT setting_value FROM app_settings WHERE setting_key='company'");
    response.json({ company: { ...defaultCompany, ...(rows[0]?.setting_value || {}) } });
  } catch (error) { next(error); }
});

router.put('/company', permissionRequired('settings.manage'), async (request, response, next) => {
  try {
    const parsed = companySchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ message: 'Tashkilot sozlamalarini tekshiring.' });
    const { rows } = await pool.query(
      `INSERT INTO app_settings(setting_key,setting_value,description,updated_by)
       VALUES('company',$1::jsonb,'Aloo SMM Panel tashkilot sozlamalari',$2)
       ON CONFLICT(setting_key) DO UPDATE SET setting_value=EXCLUDED.setting_value,updated_by=EXCLUDED.updated_by,updated_at=NOW()
       RETURNING setting_value`,
      [JSON.stringify(parsed.data), request.user.id],
    );
    await pool.query(
      `INSERT INTO audit_logs(user_id,action,ip_address,metadata) VALUES($1,'settings.company.update',$2,$3::jsonb)`,
      [request.user.id, request.ip, JSON.stringify({ companyName: parsed.data.companyName, domain: parsed.data.domain })],
    );
    response.json({ company: rows[0].setting_value });
  } catch (error) { next(error); }
});

router.get('/system', permissionRequired('settings.manage'), async (_request, response, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT
       (SELECT COUNT(*)::int FROM app_users) AS users,
       (SELECT COUNT(*)::int FROM branches) AS branches,
       (SELECT COUNT(*)::int FROM content_items) AS content_items,
       (SELECT COUNT(*)::int FROM media_assets) AS media_assets,
       (SELECT COUNT(*)::int FROM chat_messages WHERE is_deleted=FALSE) AS chat_messages,
       NOW() AS server_time`,
    );
    response.json({ version: '10.0.0', database: 'PostgreSQL', runtime: 'Node.js', stats: rows[0] });
  } catch (error) { next(error); }
});

export default router;

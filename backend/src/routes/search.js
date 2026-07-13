import { Router } from 'express';
import { pool } from '../db/pool.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();
router.use(authRequired);

function allowed(request, permission) {
  return request.user.role === 'admin' || (request.user.permissions || []).includes(permission);
}

async function safeQuery(sql, params) {
  try { return (await pool.query(sql, params)).rows; } catch { return []; }
}

router.get('/', async (request, response, next) => {
  try {
    const query = String(request.query.q || '').trim();
    if (query.length < 2) return response.json({ items: [] });
    const term = `%${query}%`;
    const jobs = [];

    if (allowed(request, 'content.view')) jobs.push(safeQuery(
      `SELECT id,title,content_type AS subtitle,'content' AS page,'content' AS result_type
       FROM content_items WHERE deleted_at IS NULL AND (title ILIKE $1 OR description ILIKE $1 OR $2=ANY(tags))
       ORDER BY updated_at DESC LIMIT 6`, [term, query],
    ));
    if (allowed(request, 'tasks.view')) jobs.push(safeQuery(
      `SELECT id,title,status AS subtitle,'tasks' AS page,'task' AS result_type
       FROM tasks WHERE title ILIKE $1 OR description ILIKE $1 ORDER BY updated_at DESC LIMIT 6`, [term],
    ));
    if (allowed(request, 'campaigns.view')) jobs.push(safeQuery(
      `SELECT id,name AS title,status AS subtitle,'campaigns' AS page,'campaign' AS result_type
       FROM campaigns WHERE name ILIKE $1 OR description ILIKE $1 ORDER BY updated_at DESC LIMIT 6`, [term],
    ));
    if (allowed(request, 'branches.view') || allowed(request, 'branches.manage')) jobs.push(safeQuery(
      `SELECT id,name AS title,COALESCE(city,address,'') AS subtitle,'branches' AS page,'branch' AS result_type
       FROM branches WHERE name ILIKE $1 OR code ILIKE $1 OR city ILIKE $1 OR address ILIKE $1 ORDER BY name LIMIT 6`, [term],
    ));
    if (allowed(request, 'team.view') || allowed(request, 'team.manage')) jobs.push(safeQuery(
      `SELECT id,full_name AS title,COALESCE(job_title,role) AS subtitle,'team' AS page,'user' AS result_type
       FROM app_users WHERE is_active=TRUE AND (full_name ILIKE $1 OR login ILIKE $1 OR phone ILIKE $1 OR email ILIKE $1)
       ORDER BY full_name LIMIT 6`, [term],
    ));
    if (allowed(request, 'media.view')) jobs.push(safeQuery(
      `SELECT id,title,COALESCE(original_name,mime_type) AS subtitle,'media' AS page,'media' AS result_type
       FROM media_assets WHERE status<>'deleted' AND (title ILIKE $1 OR original_name ILIKE $1 OR description ILIKE $1 OR $2=ANY(tags))
       ORDER BY updated_at DESC LIMIT 6`, [term, query],
    ));
    if (allowed(request, 'expenses.view') || allowed(request, 'expenses.manage')) jobs.push(safeQuery(
      `SELECT id,title,COALESCE(vendor,status) AS subtitle,'expenses' AS page,'expense' AS result_type
       FROM expenses WHERE title ILIKE $1 OR description ILIKE $1 OR vendor ILIKE $1 ORDER BY updated_at DESC LIMIT 6`, [term],
    ));

    const groups = await Promise.all(jobs);
    const items = groups.flat().slice(0, 30).map((item) => ({
      id: Number(item.id),
      title: item.title,
      subtitle: item.subtitle || '',
      page: item.page,
      resultType: item.result_type,
    }));
    response.json({ items });
  } catch (error) { next(error); }
});

export default router;

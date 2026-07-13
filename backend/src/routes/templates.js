import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { authRequired, permissionRequired } from '../middleware/auth.js';
import { publishRealtime } from '../services/realtime.js';

const router = Router();
router.use(authRequired);

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  category: z.string().trim().min(2).max(60).default('Umumiy'),
  icon: z.string().trim().max(30).default('sparkles'),
  titleTemplate: z.string().trim().max(220).default(''),
  descriptionTemplate: z.string().trim().max(8000).default(''),
  contentType: z.enum(['post','reels','story','shorts','video','carousel','banner','live']).default('post'),
  platformCode: z.string().trim().max(30).default('instagram'),
  tags: z.array(z.string().trim().max(50)).max(20).default([]),
  isActive: z.boolean().default(true),
});

function map(row) {
  return { id: Number(row.id), name: row.name, category: row.category, icon: row.icon, titleTemplate: row.title_template, descriptionTemplate: row.description_template, contentType: row.content_type, platformCode: row.platform_code, tags: row.tags || [], isActive: row.is_active, createdAt: row.created_at };
}

router.get('/', permissionRequired('content.view'), async (_request, response, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM content_templates WHERE is_active=TRUE ORDER BY sort_order,name');
    response.json({ items: rows.map(map) });
  } catch (error) { next(error); }
});

router.post('/', permissionRequired('templates.manage'), async (request, response, next) => {
  try {
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ message: 'Shablon ma’lumotlarini tekshiring.', errors: parsed.error.flatten() });
    const d = parsed.data;
    const { rows } = await pool.query(`INSERT INTO content_templates(name,category,icon,title_template,description_template,content_type,platform_code,tags,is_active,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`, [d.name,d.category,d.icon,d.titleTemplate,d.descriptionTemplate,d.contentType,d.platformCode,d.tags,d.isActive,request.user.id]);
    publishRealtime('template.created', { id: Number(rows[0].id), name: d.name });
    response.status(201).json({ item: map(rows[0]) });
  } catch (error) { next(error); }
});

router.put('/:id', permissionRequired('templates.manage'), async (request, response, next) => {
  try {
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ message: 'Shablon ma’lumotlarini tekshiring.', errors: parsed.error.flatten() });
    const d = parsed.data;
    const { rows } = await pool.query(`UPDATE content_templates SET name=$1,category=$2,icon=$3,title_template=$4,description_template=$5,content_type=$6,platform_code=$7,tags=$8,is_active=$9,updated_at=NOW() WHERE id=$10 RETURNING *`, [d.name,d.category,d.icon,d.titleTemplate,d.descriptionTemplate,d.contentType,d.platformCode,d.tags,d.isActive,Number(request.params.id)]);
    if (!rows[0]) return response.status(404).json({ message: 'Shablon topilmadi.' });
    response.json({ item: map(rows[0]) });
  } catch (error) { next(error); }
});

router.delete('/:id', permissionRequired('templates.manage'), async (request, response, next) => {
  try {
    const result = await pool.query('UPDATE content_templates SET is_active=FALSE,updated_at=NOW() WHERE id=$1', [Number(request.params.id)]);
    if (!result.rowCount) return response.status(404).json({ message: 'Shablon topilmadi.' });
    response.json({ ok: true });
  } catch (error) { next(error); }
});

export default router;

import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();

const CONTENT_TYPES = ['post', 'reels', 'story', 'shorts', 'video', 'carousel', 'banner', 'live'];
const STATUSES = ['draft', 'review', 'approved', 'scheduled', 'published', 'cancelled'];

const nullableId = z.union([z.coerce.number().int().positive(), z.literal(''), z.null(), z.undefined()])
  .transform((value) => (value === '' || value == null ? null : value));

const contentSchema = z.object({
  title: z.string().trim().min(2).max(220),
  description: z.string().trim().max(10000).default(''),
  contentType: z.enum(CONTENT_TYPES),
  platformId: z.coerce.number().int().positive(),
  branchId: nullableId,
  assignedTo: nullableId,
  status: z.enum(STATUSES).default('draft'),
  publishAt: z.union([z.string(), z.null(), z.undefined()])
    .refine((value) => !value || !Number.isNaN(new Date(value).getTime()), 'Nashr sanasi noto‘g‘ri.')
    .transform((value) => (value ? new Date(value).toISOString() : null)),
  coverUrl: z.union([z.string().url(), z.literal(''), z.null(), z.undefined()])
    .transform((value) => (value || null)),
  notes: z.string().trim().max(5000).default(''),
  tags: z.array(z.string().trim().min(1).max(50)).max(20).default([]),
});

function contentSelect() {
  return `
    SELECT
      c.id,
      c.title,
      c.description,
      c.content_type,
      c.status,
      c.publish_at,
      c.published_at,
      c.cover_url,
      c.notes,
      c.tags,
      c.created_at,
      c.updated_at,
      p.id AS platform_id,
      p.code AS platform_code,
      p.name AS platform_name,
      p.color AS platform_color,
      b.id AS branch_id,
      b.name AS branch_name,
      u.id AS assigned_to,
      u.full_name AS assignee_name,
      creator.full_name AS creator_name
    FROM content_items c
    JOIN platforms p ON p.id = c.platform_id
    LEFT JOIN branches b ON b.id = c.branch_id
    LEFT JOIN app_users u ON u.id = c.assigned_to
    JOIN app_users creator ON creator.id = c.created_by
  `;
}

function mapContent(row) {
  return {
    id: Number(row.id),
    title: row.title,
    description: row.description,
    contentType: row.content_type,
    status: row.status,
    publishAt: row.publish_at,
    publishedAt: row.published_at,
    coverUrl: row.cover_url,
    notes: row.notes,
    tags: row.tags || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    platform: {
      id: Number(row.platform_id),
      code: row.platform_code,
      name: row.platform_name,
      color: row.platform_color,
    },
    branch: row.branch_id ? { id: Number(row.branch_id), name: row.branch_name } : null,
    assignee: row.assigned_to ? { id: Number(row.assigned_to), fullName: row.assignee_name } : null,
    creatorName: row.creator_name,
  };
}

async function getContentById(id) {
  const { rows } = await pool.query(`${contentSelect()} WHERE c.id = $1 LIMIT 1`, [id]);
  return rows[0] ? mapContent(rows[0]) : null;
}

router.use(authRequired);

router.get('/', async (request, response, next) => {
  try {
    const conditions = [];
    const params = [];
    const add = (sql, value) => {
      params.push(value);
      conditions.push(sql.replace('?', `$${params.length}`));
    };

    if (request.query.search) {
      const term = `%${request.query.search}%`;
      params.push(term, term);
      conditions.push(`(c.title ILIKE $${params.length - 1} OR c.description ILIKE $${params.length})`);
    }
    if (request.query.status) add('c.status = ?', request.query.status);
    if (request.query.platformId) add('c.platform_id = ?', Number(request.query.platformId));
    if (request.query.branchId) add('c.branch_id = ?', Number(request.query.branchId));
    if (request.query.from) add('c.publish_at >= ?', new Date(request.query.from).toISOString());
    if (request.query.to) add('c.publish_at < ?', new Date(request.query.to).toISOString());

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = Math.min(Math.max(Number(request.query.limit) || 100, 1), 250);
    params.push(limit);

    const { rows } = await pool.query(
      `${contentSelect()} ${where}
       ORDER BY c.publish_at ASC NULLS LAST, c.created_at DESC
       LIMIT $${params.length}`,
      params,
    );

    response.json({ items: rows.map(mapContent), total: rows.length });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (request, response, next) => {
  try {
    const item = await getContentById(Number(request.params.id));
    if (!item) return response.status(404).json({ message: 'Kontent topilmadi.' });
    return response.json({ item });
  } catch (error) {
    return next(error);
  }
});

router.post('/', async (request, response, next) => {
  const client = await pool.connect();
  try {
    const parsed = contentSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ message: 'Kontent ma’lumotlarini tekshiring.', errors: parsed.error.flatten() });

    const data = parsed.data;
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO content_items (
        title, description, content_type, platform_id, branch_id, assigned_to,
        status, publish_at, published_at, cover_url, notes, tags, created_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING id`,
      [
        data.title, data.description, data.contentType, data.platformId, data.branchId, data.assignedTo,
        data.status, data.publishAt, data.status === 'published' ? new Date().toISOString() : null,
        data.coverUrl, data.notes, data.tags, request.user.id,
      ],
    );
    const id = rows[0].id;
    await client.query(
      `INSERT INTO content_status_history (content_id, old_status, new_status, changed_by, comment)
       VALUES ($1, NULL, $2, $3, 'Kontent yaratildi')`,
      [id, data.status, request.user.id],
    );
    await client.query(
      `INSERT INTO audit_logs (user_id, action, ip_address, metadata)
       VALUES ($1, 'content.create', $2, $3::jsonb)`,
      [request.user.id, request.ip, JSON.stringify({ contentId: Number(id), title: data.title })],
    );
    await client.query('COMMIT');

    const item = await getContentById(id);
    return response.status(201).json({ item });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    return next(error);
  } finally {
    client.release();
  }
});

router.put('/:id', async (request, response, next) => {
  const client = await pool.connect();
  try {
    const id = Number(request.params.id);
    const parsed = contentSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ message: 'Kontent ma’lumotlarini tekshiring.', errors: parsed.error.flatten() });

    const current = await client.query('SELECT status FROM content_items WHERE id = $1', [id]);
    if (!current.rows[0]) return response.status(404).json({ message: 'Kontent topilmadi.' });

    const data = parsed.data;
    await client.query('BEGIN');
    await client.query(
      `UPDATE content_items SET
        title=$1, description=$2, content_type=$3, platform_id=$4, branch_id=$5,
        assigned_to=$6, status=$7, publish_at=$8,
        published_at=CASE WHEN $7='published' AND published_at IS NULL THEN NOW() WHEN $7<>'published' THEN NULL ELSE published_at END,
        cover_url=$9, notes=$10, tags=$11
       WHERE id=$12`,
      [data.title, data.description, data.contentType, data.platformId, data.branchId, data.assignedTo, data.status, data.publishAt, data.coverUrl, data.notes, data.tags, id],
    );

    if (current.rows[0].status !== data.status) {
      await client.query(
        `INSERT INTO content_status_history (content_id, old_status, new_status, changed_by)
         VALUES ($1, $2, $3, $4)`,
        [id, current.rows[0].status, data.status, request.user.id],
      );
    }
    await client.query(
      `INSERT INTO audit_logs (user_id, action, ip_address, metadata)
       VALUES ($1, 'content.update', $2, $3::jsonb)`,
      [request.user.id, request.ip, JSON.stringify({ contentId: id, title: data.title })],
    );
    await client.query('COMMIT');

    const item = await getContentById(id);
    return response.json({ item });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    return next(error);
  } finally {
    client.release();
  }
});

router.delete('/:id', async (request, response, next) => {
  try {
    const id = Number(request.params.id);
    const { rows } = await pool.query('DELETE FROM content_items WHERE id = $1 RETURNING id, title', [id]);
    if (!rows[0]) return response.status(404).json({ message: 'Kontent topilmadi.' });
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, ip_address, metadata)
       VALUES ($1, 'content.delete', $2, $3::jsonb)`,
      [request.user.id, request.ip, JSON.stringify({ contentId: id, title: rows[0].title })],
    );
    return response.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

export default router;

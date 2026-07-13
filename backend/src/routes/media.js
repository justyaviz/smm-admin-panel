import { createHash, randomUUID } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { authRequired, permissionRequired } from '../middleware/auth.js';

const router = Router();
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_FILES = 6;
const MAX_TOTAL_BYTES = 30 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'image/heic', 'image/heif',
  'video/mp4', 'video/webm', 'video/quicktime',
  'audio/mpeg', 'audio/wav', 'audio/ogg',
  'application/pdf', 'text/plain', 'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

const nullableId = z.union([z.coerce.number().int().positive(), z.literal(''), z.null(), z.undefined()])
  .transform((value) => (value === '' || value == null ? null : value));

const folderSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(1000).default(''),
  color: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).default('#1690F5'),
  parentId: nullableId,
});

const assetUpdateSchema = z.object({
  displayName: z.string().trim().min(1).max(220),
  description: z.string().trim().max(3000).default(''),
  altText: z.string().trim().max(500).default(''),
  folderId: nullableId,
  branchId: nullableId,
  tags: z.array(z.string().trim().min(1).max(50)).max(30).default([]),
  status: z.enum(['active', 'archived']).default('active'),
});

function mediaTypeFromMime(mimeType) {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType === 'application/pdf' || mimeType.includes('word') || mimeType.includes('excel') || mimeType.startsWith('text/')) return 'document';
  return 'other';
}

function safeOriginalName(value) {
  return String(value || 'media-file')
    .replace(/[\u0000-\u001f<>:"/\\|?*]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 255) || 'media-file';
}

function extensionFromName(name) {
  const match = String(name).toLowerCase().match(/\.([a-z0-9]{1,12})$/);
  return match ? match[1] : '';
}

function parseBase64File(file) {
  const name = safeOriginalName(file?.name);
  const suppliedMime = String(file?.type || '').toLowerCase();
  const raw = String(file?.data || '');
  const match = raw.match(/^data:([^;,]+);base64,([a-zA-Z0-9+/=\s]+)$/);
  if (!match) throw new Error(`${name}: fayl ma’lumoti noto‘g‘ri.`);
  const mimeType = suppliedMime || match[1].toLowerCase();
  if (!ALLOWED_MIME_TYPES.has(mimeType)) throw new Error(`${name}: ushbu fayl turi qo‘llab-quvvatlanmaydi.`);
  const buffer = Buffer.from(match[2].replace(/\s/g, ''), 'base64');
  if (!buffer.length) throw new Error(`${name}: fayl bo‘sh.`);
  if (buffer.length > MAX_FILE_BYTES) throw new Error(`${name}: fayl 8 MB dan katta.`);
  return { name, mimeType, buffer, extension: extensionFromName(name), mediaType: mediaTypeFromMime(mimeType) };
}

function mediaSelect() {
  return `
    SELECT
      m.id, m.display_name, m.original_name, m.file_name, m.mime_type, m.media_type,
      m.extension, m.size_bytes, m.width, m.height, m.duration_seconds,
      m.description, m.alt_text, m.tags, m.status, m.is_favorite, m.download_count,
      m.content_hash, m.last_used_at, m.created_at, m.updated_at,
      f.id AS folder_id, f.name AS folder_name, f.color AS folder_color,
      b.id AS branch_id, b.name AS branch_name,
      u.full_name AS uploader_name
    FROM media_assets m
    LEFT JOIN media_folders f ON f.id = m.folder_id
    LEFT JOIN branches b ON b.id = m.branch_id
    JOIN app_users u ON u.id = m.uploaded_by
  `;
}

function mapAsset(row) {
  return {
    id: Number(row.id),
    displayName: row.display_name,
    originalName: row.original_name,
    fileName: row.file_name,
    mimeType: row.mime_type,
    mediaType: row.media_type,
    extension: row.extension,
    sizeBytes: Number(row.size_bytes || 0),
    width: row.width == null ? null : Number(row.width),
    height: row.height == null ? null : Number(row.height),
    durationSeconds: row.duration_seconds == null ? null : Number(row.duration_seconds),
    description: row.description,
    altText: row.alt_text,
    tags: row.tags || [],
    status: row.status,
    isFavorite: Boolean(row.is_favorite),
    downloadCount: Number(row.download_count || 0),
    contentHash: row.content_hash || null,
    lastUsedAt: row.last_used_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    folder: row.folder_id ? { id: Number(row.folder_id), name: row.folder_name, color: row.folder_color } : null,
    branch: row.branch_id ? { id: Number(row.branch_id), name: row.branch_name } : null,
    uploaderName: row.uploader_name,
    fileUrl: `/api/media/${row.id}/file`,
  };
}

async function getAsset(id) {
  const { rows } = await pool.query(`${mediaSelect()} WHERE m.id=$1 LIMIT 1`, [id]);
  return rows[0] ? mapAsset(rows[0]) : null;
}

router.use(authRequired);

router.get('/summary', permissionRequired('media.view'), async (_request, response, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status='active')::int AS total,
        COUNT(*) FILTER (WHERE status='active' AND media_type='image')::int AS images,
        COUNT(*) FILTER (WHERE status='active' AND media_type='video')::int AS videos,
        COUNT(*) FILTER (WHERE status='active' AND media_type='document')::int AS documents,
        COUNT(*) FILTER (WHERE status='active' AND is_favorite)::int AS favorites,
        COALESCE(SUM(size_bytes) FILTER (WHERE status='active'),0)::bigint AS storage_bytes
      FROM media_assets
    `);
    response.json({ metrics: {
      total: Number(rows[0].total || 0), images: Number(rows[0].images || 0),
      videos: Number(rows[0].videos || 0), documents: Number(rows[0].documents || 0),
      favorites: Number(rows[0].favorites || 0), storageBytes: Number(rows[0].storage_bytes || 0),
      maxFileBytes: MAX_FILE_BYTES,
    } });
  } catch (error) { next(error); }
});

router.get('/folders', permissionRequired('media.view'), async (_request, response, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT f.id, f.name, f.description, f.color, f.parent_id, f.created_at,
             COUNT(m.id) FILTER (WHERE m.status='active')::int AS asset_count,
             COALESCE(SUM(m.size_bytes) FILTER (WHERE m.status='active'),0)::bigint AS size_bytes
      FROM media_folders f
      LEFT JOIN media_assets m ON m.folder_id=f.id
      GROUP BY f.id
      ORDER BY LOWER(f.name)
    `);
    response.json({ items: rows.map((row) => ({
      id: Number(row.id), name: row.name, description: row.description, color: row.color,
      parentId: row.parent_id ? Number(row.parent_id) : null,
      assetCount: Number(row.asset_count || 0), sizeBytes: Number(row.size_bytes || 0), createdAt: row.created_at,
    })) });
  } catch (error) { next(error); }
});

router.post('/folders', permissionRequired('media.manage'), async (request, response, next) => {
  try {
    const parsed = folderSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ message: 'Papka ma’lumotlarini tekshiring.', errors: parsed.error.flatten() });
    const d = parsed.data;
    const { rows } = await pool.query(
      `INSERT INTO media_folders (name,description,color,parent_id,created_by)
       VALUES ($1,$2,$3,$4,$5) RETURNING id,name,description,color,parent_id,created_at`,
      [d.name, d.description, d.color, d.parentId, request.user.id],
    );
    await pool.query(`INSERT INTO audit_logs (user_id,action,ip_address,metadata) VALUES ($1,'media.folder.create',$2,$3::jsonb)`, [request.user.id, request.ip, JSON.stringify({ folderId: Number(rows[0].id), name: d.name })]);
    return response.status(201).json({ item: { ...rows[0], id: Number(rows[0].id), parentId: rows[0].parent_id ? Number(rows[0].parent_id) : null, assetCount: 0, sizeBytes: 0 } });
  } catch (error) {
    if (error.code === '23505') return response.status(409).json({ message: 'Bu nomdagi papka mavjud.' });
    return next(error);
  }
});

router.put('/folders/:id', permissionRequired('media.manage'), async (request, response, next) => {
  try {
    const id = Number(request.params.id);
    const parsed = folderSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ message: 'Papka ma’lumotlarini tekshiring.', errors: parsed.error.flatten() });
    if (parsed.data.parentId === id) return response.status(400).json({ message: 'Papka o‘ziga ota papka bo‘la olmaydi.' });
    const d = parsed.data;
    const { rows } = await pool.query(`UPDATE media_folders SET name=$1,description=$2,color=$3,parent_id=$4 WHERE id=$5 RETURNING id`, [d.name,d.description,d.color,d.parentId,id]);
    if (!rows[0]) return response.status(404).json({ message: 'Papka topilmadi.' });
    return response.json({ ok: true });
  } catch (error) {
    if (error.code === '23505') return response.status(409).json({ message: 'Bu nomdagi papka mavjud.' });
    return next(error);
  }
});

router.delete('/folders/:id', permissionRequired('media.manage'), async (request, response, next) => {
  try {
    const id = Number(request.params.id);
    const used = await pool.query(`SELECT (SELECT COUNT(*) FROM media_assets WHERE folder_id=$1) + (SELECT COUNT(*) FROM media_folders WHERE parent_id=$1) AS count`, [id]);
    if (Number(used.rows[0].count) > 0) return response.status(409).json({ message: 'Papka bo‘sh emas. Avval ichidagi fayllarni boshqa joyga ko‘chiring.' });
    const { rows } = await pool.query('DELETE FROM media_folders WHERE id=$1 RETURNING id,name', [id]);
    if (!rows[0]) return response.status(404).json({ message: 'Papka topilmadi.' });
    return response.json({ ok: true });
  } catch (error) { return next(error); }
});

router.get('/recent', permissionRequired('media.view'), async (request, response, next) => {
  try {
    const { rows } = await pool.query(`${mediaSelect()} WHERE m.status='active' ORDER BY m.last_used_at DESC NULLS LAST,m.created_at DESC LIMIT 12`);
    response.json({ items: rows.map(mapAsset) });
  } catch (error) { next(error); }
});

router.post('/:id/use', permissionRequired('media.view'), async (request, response, next) => {
  try {
    const { rows } = await pool.query('UPDATE media_assets SET last_used_at=NOW() WHERE id=$1 RETURNING id', [Number(request.params.id)]);
    if (!rows[0]) return response.status(404).json({ message: 'Media topilmadi.' });
    response.json({ ok: true });
  } catch (error) { next(error); }
});

router.get('/', permissionRequired('media.view'), async (request, response, next) => {
  try {
    const conditions = [];
    const params = [];
    const add = (sql, value) => { params.push(value); conditions.push(sql.replace('?', `$${params.length}`)); };
    if (request.query.search) {
      const term = `%${request.query.search}%`;
      params.push(term, term, term);
      conditions.push(`(m.display_name ILIKE $${params.length - 2} OR m.original_name ILIKE $${params.length - 1} OR m.description ILIKE $${params.length})`);
    }
    if (request.query.mediaType) add('m.media_type=?', request.query.mediaType);
    if (request.query.folderId === 'root') conditions.push('m.folder_id IS NULL');
    else if (request.query.folderId) add('m.folder_id=?', Number(request.query.folderId));
    if (request.query.branchId) add('m.branch_id=?', Number(request.query.branchId));
    if (request.query.favorite === 'true') conditions.push('m.is_favorite=TRUE');
    add('m.status=?', request.query.status || 'active');
    const page = Math.max(Number(request.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(request.query.limit) || 60, 1), 100);
    const offset = (page - 1) * limit;
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const totalQuery = await pool.query(`SELECT COUNT(*)::int AS count FROM media_assets m ${where}`, params);
    params.push(limit, offset);
    const { rows } = await pool.query(`${mediaSelect()} ${where} ORDER BY m.is_favorite DESC, m.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
    response.json({ items: rows.map(mapAsset), total: Number(totalQuery.rows[0].count), page, limit });
  } catch (error) { next(error); }
});

router.post('/upload', permissionRequired('media.manage'), async (request, response, next) => {
  const client = await pool.connect();
  try {
    const files = Array.isArray(request.body?.files) ? request.body.files : [];
    if (!files.length) return response.status(400).json({ message: 'Kamida bitta fayl tanlang.' });
    if (files.length > MAX_FILES) return response.status(400).json({ message: `Bir martada ko‘pi bilan ${MAX_FILES} ta fayl yuklanadi.` });
    const parsedFiles = files.map(parseBase64File);
    const totalBytes = parsedFiles.reduce((sum, file) => sum + file.buffer.length, 0);
    if (totalBytes > MAX_TOTAL_BYTES) return response.status(400).json({ message: 'Bir yuklashdagi umumiy fayl hajmi 30 MB dan oshmasligi kerak.' });
    const folderId = request.body.folderId ? Number(request.body.folderId) : null;
    const branchId = request.body.branchId ? Number(request.body.branchId) : null;
    const description = String(request.body.description || '').trim().slice(0, 3000);
    const altText = String(request.body.altText || '').trim().slice(0, 500);
    const tags = Array.isArray(request.body.tags) ? request.body.tags.map((x) => String(x).trim()).filter(Boolean).slice(0, 30) : [];
    const displayName = String(request.body.displayName || '').trim().slice(0, 220);

    await client.query('BEGIN');
    const ids = [];
    const duplicateIds = [];
    for (const file of parsedFiles) {
      const contentHash = createHash('sha256').update(file.buffer).digest('hex');
      const existing = await client.query(`SELECT id FROM media_assets WHERE content_hash=$1 AND status='active' LIMIT 1`, [contentHash]);
      if (existing.rows[0]) {
        duplicateIds.push(Number(existing.rows[0].id));
        continue;
      }
      const storedName = `${randomUUID()}${file.extension ? `.${file.extension}` : ''}`;
      const result = await client.query(
        `INSERT INTO media_assets (
          display_name,original_name,file_name,mime_type,media_type,extension,size_bytes,file_data,
          folder_id,branch_id,description,alt_text,tags,uploaded_by,content_hash
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING id`,
        [displayName && parsedFiles.length === 1 ? displayName : file.name, file.name, storedName, file.mimeType, file.mediaType, file.extension, file.buffer.length, file.buffer, folderId, branchId, description, altText, tags, request.user.id, contentHash],
      );
      ids.push(Number(result.rows[0].id));
    }
    await client.query(`INSERT INTO audit_logs (user_id,action,ip_address,metadata) VALUES ($1,'media.upload',$2,$3::jsonb)`, [request.user.id, request.ip, JSON.stringify({ assetIds: ids, count: ids.length, duplicateIds })]);
    await client.query('COMMIT');
    const allIds = [...ids, ...duplicateIds];
    const { rows } = allIds.length ? await pool.query(`${mediaSelect()} WHERE m.id=ANY($1::bigint[]) ORDER BY m.created_at DESC`, [allIds]) : { rows: [] };
    return response.status(ids.length ? 201 : 200).json({ items: rows.map(mapAsset), uploadedCount: ids.length, duplicateIds });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    if (error.message?.includes('MB') || error.message?.includes('fayl')) return response.status(400).json({ message: error.message });
    return next(error);
  } finally { client.release(); }
});

router.get('/:id/file', permissionRequired('media.view'), async (request, response, next) => {
  try {
    const id = Number(request.params.id);
    const { rows } = await pool.query(`SELECT original_name,mime_type,size_bytes,file_data FROM media_assets WHERE id=$1 LIMIT 1`, [id]);
    const file = rows[0];
    if (!file) return response.status(404).json({ message: 'Fayl topilmadi.' });
    const download = request.query.download === '1';
    if (download) await pool.query('UPDATE media_assets SET download_count=download_count+1 WHERE id=$1', [id]);
    const disposition = `${download ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(file.original_name)}`;
    response.setHeader('Content-Type', file.mime_type);
    response.setHeader('Content-Length', Number(file.size_bytes));
    response.setHeader('Content-Disposition', disposition);
    response.setHeader('Cache-Control', 'private, max-age=300');
    return response.send(file.file_data);
  } catch (error) { return next(error); }
});

router.get('/:id', permissionRequired('media.view'), async (request, response, next) => {
  try {
    const item = await getAsset(Number(request.params.id));
    if (!item) return response.status(404).json({ message: 'Media topilmadi.' });
    return response.json({ item });
  } catch (error) { return next(error); }
});

router.put('/:id', permissionRequired('media.manage'), async (request, response, next) => {
  try {
    const id = Number(request.params.id);
    const parsed = assetUpdateSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ message: 'Media ma’lumotlarini tekshiring.', errors: parsed.error.flatten() });
    const d = parsed.data;
    const { rows } = await pool.query(
      `UPDATE media_assets SET display_name=$1,description=$2,alt_text=$3,folder_id=$4,branch_id=$5,tags=$6,status=$7 WHERE id=$8 RETURNING id`,
      [d.displayName,d.description,d.altText,d.folderId,d.branchId,d.tags,d.status,id],
    );
    if (!rows[0]) return response.status(404).json({ message: 'Media topilmadi.' });
    await pool.query(`INSERT INTO audit_logs (user_id,action,ip_address,metadata) VALUES ($1,'media.update',$2,$3::jsonb)`, [request.user.id, request.ip, JSON.stringify({ assetId: id })]);
    return response.json({ item: await getAsset(id) });
  } catch (error) { return next(error); }
});

router.patch('/:id/favorite', permissionRequired('media.manage'), async (request, response, next) => {
  try {
    const id = Number(request.params.id);
    const { rows } = await pool.query('UPDATE media_assets SET is_favorite=NOT is_favorite WHERE id=$1 RETURNING is_favorite', [id]);
    if (!rows[0]) return response.status(404).json({ message: 'Media topilmadi.' });
    return response.json({ isFavorite: Boolean(rows[0].is_favorite) });
  } catch (error) { return next(error); }
});

router.delete('/:id', permissionRequired('media.manage'), async (request, response, next) => {
  try {
    const id = Number(request.params.id);
    const { rows } = await pool.query('DELETE FROM media_assets WHERE id=$1 RETURNING id,display_name', [id]);
    if (!rows[0]) return response.status(404).json({ message: 'Media topilmadi.' });
    await pool.query(`INSERT INTO audit_logs (user_id,action,ip_address,metadata) VALUES ($1,'media.delete',$2,$3::jsonb)`, [request.user.id, request.ip, JSON.stringify({ assetId: id, name: rows[0].display_name })]);
    return response.json({ ok: true });
  } catch (error) { return next(error); }
});

export default router;

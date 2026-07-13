-- OPTIONAL DEMO DATA — faqat test yoki taqdimot muhiti uchun.
-- Production ma’lumotlar bazasida ishlatish majburiy emas.

WITH admin_user AS (
  SELECT id FROM app_users WHERE role = 'admin' ORDER BY id LIMIT 1
), data(title, description, content_type, platform_code, branch_code, status, publish_at) AS (
  VALUES
    ('Chilla yarmarkasi reels', 'Konditsioner va muzlatgichlar uchun qisqa promo video.', 'reels', 'instagram', 'chirchiq', 'scheduled', NOW() + INTERVAL '1 day 10 hours'),
    ('Qo‘shaloq bonus story', 'Xaridga sovg‘a aksiyasi bo‘yicha 3 qismli story.', 'story', 'instagram', 'parkent', 'approved', NOW() + INTERVAL '2 days 12 hours'),
    ('Redmi Note 14 Pro aksiyasi', 'Mahsulot narxi va muddatli to‘lov shartlari.', 'post', 'telegram', 'chinoz', 'review', NOW() + INTERVAL '3 days 9 hours'),
    ('Honor 600 video obzor', 'YouTube uchun mahsulot obzori.', 'video', 'youtube', NULL, 'draft', NOW() + INTERVAL '5 days 15 hours'),
    ('Muzzzdek narxlar karuseli', 'Konditsionerlar chegirmasi bo‘yicha karusel.', 'carousel', 'facebook', 'angren', 'published', NOW() - INTERVAL '1 day')
)
INSERT INTO content_items (
  title, description, content_type, platform_id, branch_id, assigned_to,
  status, publish_at, published_at, created_by
)
SELECT
  data.title,
  data.description,
  data.content_type,
  p.id,
  b.id,
  a.id,
  data.status,
  data.publish_at,
  CASE WHEN data.status = 'published' THEN data.publish_at ELSE NULL END,
  a.id
FROM data
JOIN platforms p ON p.code = data.platform_code
LEFT JOIN branches b ON b.code = data.branch_code
CROSS JOIN admin_user a
WHERE NOT EXISTS (SELECT 1 FROM content_items WHERE content_items.title = data.title);

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

-- Step 3 demo campaigns and target ads
WITH admin_user AS (
  SELECT id FROM app_users WHERE role = 'admin' ORDER BY id LIMIT 1
), campaign_data(name, objective, product_direction, status, budget, spend, reach, impressions, clicks, video_views, engagement, messages, sales_count, sales_value, start_date, end_date) AS (
  VALUES
    ('Chilla yarmarkasi', 'promo', 'Konditsioner va muzlatgichlar', 'active', 25000000, 18760300, 845000, 1240000, 18940, 255000, 42000, 1850, 96, 64200000, CURRENT_DATE - 6, CURRENT_DATE + 5),
    ('Qo‘shaloq bonus', 'sales', 'Barcha texnika va sovg‘alar', 'completed', 18000000, 16950000, 620000, 980000, 14200, 185000, 35500, 1240, 124, 81500000, CURRENT_DATE - 16, CURRENT_DATE - 5),
    ('Muzzzdek narxlar', 'traffic', 'Konditsionerlar', 'planned', 14000000, 0, 0, 0, 0, 0, 0, 0, 0, 0, CURRENT_DATE + 4, CURRENT_DATE + 12),
    ('Alif Juma', 'engagement', 'Muddatli to‘lov', 'paused', 22000000, 9800000, 415000, 740000, 9100, 132000, 28000, 720, 54, 38200000, CURRENT_DATE - 11, CURRENT_DATE + 2)
)
INSERT INTO campaigns (
  name, objective, product_direction, status, budget, spend, reach, impressions, clicks,
  video_views, engagement, messages, sales_count, sales_value, start_date, end_date, created_by
)
SELECT d.name, d.objective, d.product_direction, d.status, d.budget, d.spend, d.reach, d.impressions, d.clicks,
       d.video_views, d.engagement, d.messages, d.sales_count, d.sales_value, d.start_date, d.end_date, a.id
FROM campaign_data d CROSS JOIN admin_user a
WHERE NOT EXISTS (SELECT 1 FROM campaigns c WHERE c.name = d.name);

INSERT INTO campaign_platforms (campaign_id, platform_id)
SELECT c.id, p.id
FROM campaigns c
JOIN platforms p ON p.code IN ('instagram','facebook','telegram')
WHERE c.name IN ('Chilla yarmarkasi','Qo‘shaloq bonus','Muzzzdek narxlar','Alif Juma')
ON CONFLICT DO NOTHING;

INSERT INTO campaign_branches (campaign_id, branch_id)
SELECT c.id, b.id
FROM campaigns c
JOIN branches b ON b.code IN ('chirchiq','parkent','chinoz','piskent','angren','jarqorgon')
WHERE c.name IN ('Chilla yarmarkasi','Qo‘shaloq bonus','Muzzzdek narxlar','Alif Juma')
ON CONFLICT DO NOTHING;

WITH admin_user AS (
  SELECT id FROM app_users WHERE role = 'admin' ORDER BY id LIMIT 1
), ad_data(name, campaign_name, platform_code, branch_code, objective, audience, status, daily_budget, total_budget, spend, impressions, reach, clicks, messages, sales_count) AS (
  VALUES
    ('Chirchiq smartfon aksiyasi', 'Chilla yarmarkasi', 'instagram', 'chirchiq', 'sales', '18–35 yosh, Toshkent viloyati, smartfon xaridorlari', 'active', 3000000, 9000000, 2450300, 243500, 182000, 6284, 342, 28),
    ('Parkent konditsioner target', 'Chilla yarmarkasi', 'telegram', 'parkent', 'messages', '25–45 yosh, Parkent va yaqin hududlar', 'active', 1800000, 5400000, 1230450, 176800, 142000, 3841, 415, 19),
    ('Chinoz TV reklama', 'Alif Juma', 'facebook', 'chinoz', 'awareness', '18–45 yosh, TV va maishiy texnikaga qiziqish', 'active', 1500000, 4500000, 1045200, 198400, 165000, 2987, 128, 12),
    ('Jarqo‘rg‘on sovg‘a aksiyasi', 'Qo‘shaloq bonus', 'instagram', 'jarqorgon', 'sales', '20–40 yosh, Surxondaryo viloyati', 'paused', 1200000, 3600000, 856700, 107500, 89000, 2289, 201, 16)
)
INSERT INTO target_ads (
  name, campaign_id, platform_id, branch_id, objective, audience, status,
  daily_budget, total_budget, spend, impressions, reach, clicks, messages, sales_count,
  start_date, end_date, created_by
)
SELECT d.name, c.id, p.id, b.id, d.objective, d.audience, d.status,
       d.daily_budget, d.total_budget, d.spend, d.impressions, d.reach, d.clicks, d.messages, d.sales_count,
       CURRENT_DATE - 6, CURRENT_DATE + 4, a.id
FROM ad_data d
JOIN campaigns c ON c.name = d.campaign_name
JOIN platforms p ON p.code = d.platform_code
LEFT JOIN branches b ON b.code = d.branch_code
CROSS JOIN admin_user a
WHERE NOT EXISTS (SELECT 1 FROM target_ads t WHERE t.name = d.name);

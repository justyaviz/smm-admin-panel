-- aloo SMM Panel Step 8 — ixtiyoriy demo chat va bildirishnomalar
-- Faqat test va dizayn ko‘rinishi uchun.

BEGIN;

INSERT INTO chat_channels(name,slug,channel_type,description,color,created_by)
SELECT 'Kontent jamoasi','demo-kontent-jamoasi','group','Reels, post va dizayn jarayonlari uchun demo guruh','#6941C6',MIN(id)
FROM app_users
HAVING COUNT(*) > 0
ON CONFLICT(slug) DO UPDATE SET is_archived=FALSE;

INSERT INTO chat_channel_members(channel_id,user_id,member_role,last_read_at)
SELECT c.id,u.id,CASE WHEN u.role='admin' THEN 'owner' ELSE 'member' END,NOW()-INTERVAL '2 hours'
FROM chat_channels c
JOIN LATERAL (SELECT id,role FROM app_users WHERE is_active=TRUE ORDER BY id LIMIT 5) u ON TRUE
WHERE c.slug='demo-kontent-jamoasi'
ON CONFLICT(channel_id,user_id) DO NOTHING;

INSERT INTO chat_messages(channel_id,sender_id,body,created_at)
SELECT c.id,u.id,'Bugungi reels uchun mahsulotlar ro‘yxati tayyor. Chirchiq filialidan boshlaymiz.',NOW()-INTERVAL '90 minutes'
FROM chat_channels c
JOIN LATERAL (SELECT id FROM app_users WHERE is_active=TRUE ORDER BY id LIMIT 1) u ON TRUE
WHERE c.slug='demo-kontent-jamoasi'
  AND NOT EXISTS(SELECT 1 FROM chat_messages m WHERE m.channel_id=c.id)
UNION ALL
SELECT c.id,u.id,'Dizayn coverini soat 15:00 gacha media kutubxonaga joylayman.',NOW()-INTERVAL '55 minutes'
FROM chat_channels c
JOIN LATERAL (SELECT id FROM app_users WHERE is_active=TRUE ORDER BY id OFFSET 1 LIMIT 1) u ON TRUE
WHERE c.slug='demo-kontent-jamoasi'
  AND NOT EXISTS(SELECT 1 FROM chat_messages m WHERE m.channel_id=c.id);

UPDATE chat_channels c
SET last_message_at=(SELECT MAX(m.created_at) FROM chat_messages m WHERE m.channel_id=c.id)
WHERE c.slug='demo-kontent-jamoasi';

INSERT INTO notifications(user_id,notification_type,title,message,link_page,link_entity_id,dedupe_key,created_at)
SELECT u.id,'task_assigned','Yangi vazifa','Chilla yarmarkasi reels coverini tayyorlash','tasks',NULL,'step8-demo-task',NOW()-INTERVAL '35 minutes'
FROM app_users u WHERE u.is_active=TRUE
ON CONFLICT(user_id,dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;

INSERT INTO notifications(user_id,notification_type,title,message,link_page,link_entity_id,dedupe_key,created_at)
SELECT u.id,'report_ready','Hisobot tayyor','Haftalik SMM hisoboti yuklab olishga tayyor.','reports',NULL,'step8-demo-report',NOW()-INTERVAL '15 minutes'
FROM app_users u WHERE u.is_active=TRUE
ON CONFLICT(user_id,dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;

COMMIT;

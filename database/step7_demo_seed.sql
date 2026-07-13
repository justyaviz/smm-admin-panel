-- aloo SMM Panel Step 7 demo ma’lumotlari
-- Ixtiyoriy. Faqat test va dizayn ko‘rinishi uchun.

BEGIN;

WITH admin_user AS (
  SELECT id FROM app_users ORDER BY (role='admin') DESC,id LIMIT 1
), task_seed(title,description,status,priority,branch_code,assignee_role,due_offset,estimated,tags) AS (
  VALUES
    ('Chirchiq uchun Reels cover','Chilla yarmarkasi Reels videosi uchun yangi cover tayyorlash.','in_progress','urgent','chirchiq','designer',INTERVAL '6 hours',90,ARRAY['reels','chilla']::text[]),
    ('Parkent mahsulot videosi','Smartfonlar aksiyasi uchun 30 soniyalik vertikal video olish.','todo','high','parkent','mobilograf',INTERVAL '1 day',120,ARRAY['video','smartfon']::text[]),
    ('Haftalik kontent reja','Keyingi haftaning Instagram va Telegram postlarini rejalashtirish.','review','high',NULL,'smm_manager',INTERVAL '2 days',150,ARRAY['reja','haftalik']::text[]),
    ('Target natijalarini kiritish','Faol reklamalar reach, klik va sarf ko‘rsatkichlarini yangilash.','todo','medium',NULL,'targetolog',INTERVAL '1 day 4 hours',60,ARRAY['target','analitika']::text[]),
    ('Filiallardan media yig‘ish','Barcha filiallardan mamnun mijoz videolarini qabul qilish.','backlog','medium',NULL,'smm_manager',INTERVAL '4 days',180,ARRAY['media','filiallar']::text[]),
    ('Oylik SMM hisobot','Oylik KPI, kampaniya va filiallar hisobotini tayyorlash.','todo','urgent',NULL,'analyst',INTERVAL '5 days',240,ARRAY['hisobot','kpi']::text[]),
    ('Instagram bio yangilash','Aksiya CTA va aloqa ma’lumotlarini tekshirib yangilash.','done','low',NULL,'copywriter',INTERVAL '-1 day',30,ARRAY['instagram','bio']::text[])
)
INSERT INTO tasks(title,description,status,priority,branch_id,assigned_to,due_at,completed_at,estimated_minutes,tags,created_by)
SELECT s.title,s.description,s.status,s.priority,b.id,
       COALESCE((SELECT id FROM app_users WHERE role=s.assignee_role AND is_active=TRUE ORDER BY id LIMIT 1),u.id),
       NOW()+s.due_offset,CASE WHEN s.status='done' THEN NOW()-INTERVAL '2 hours' ELSE NULL END,s.estimated,s.tags,u.id
FROM task_seed s
CROSS JOIN admin_user u
LEFT JOIN branches b ON b.code=s.branch_code
WHERE NOT EXISTS (SELECT 1 FROM tasks t WHERE t.title=s.title);

INSERT INTO task_status_history(task_id,old_status,new_status,changed_by,comment)
SELECT t.id,NULL,t.status,u.id,'Demo vazifa yaratildi'
FROM tasks t
CROSS JOIN (SELECT id FROM app_users ORDER BY (role='admin') DESC,id LIMIT 1) u
WHERE t.title IN ('Chirchiq uchun Reels cover','Parkent mahsulot videosi','Haftalik kontent reja','Target natijalarini kiritish','Filiallardan media yig‘ish','Oylik SMM hisobot','Instagram bio yangilash')
  AND NOT EXISTS (SELECT 1 FROM task_status_history h WHERE h.task_id=t.id);

WITH admin_user AS (
  SELECT id FROM app_users ORDER BY (role='admin') DESC,id LIMIT 1
), expense_seed(title,description,category_code,branch_code,amount,status,payment_method,vendor,day_offset) AS (
  VALUES
    ('Meta Ads — Chilla yarmarkasi','Instagram va Facebook target reklamasi','target_ads',NULL,8500000::numeric,'paid','corporate_card','Meta Platforms',-8),
    ('Chirchiq Reels suratga olish','Mobilograf transport va suratga olish xarajati','content_production','chirchiq',750000::numeric,'approved','transfer','Freelance mobilograf',-4),
    ('Canva Pro obunasi','Jamoa uchun oylik dizayn servisi','software',NULL,185000::numeric,'paid','card','Canva',-12),
    ('Aksiya bannerlari','Filiallar uchun tashqi banner chop etish','printing','parkent',1200000::numeric,'pending','transfer','Print House',-1),
    ('LED yoritgich','Kontent olish uchun studiya yoritgichi','equipment',NULL,1650000::numeric,'approved','card','Texno Market',-3),
    ('Filiallar safari','Chirchiq va Parkent filiallariga kontent safari','transport',NULL,480000::numeric,'paid','cash','Transport',-6),
    ('Dizayner xizmat haqi','Aksiya karuseli va cover dizaynlari','design',NULL,950000::numeric,'pending','transfer','Freelance designer',0)
)
INSERT INTO expenses(title,description,category_id,branch_id,amount,expense_date,status,payment_method,vendor,requested_by,approved_by,approved_at,paid_at,created_by)
SELECT s.title,s.description,ec.id,b.id,s.amount,CURRENT_DATE+s.day_offset,s.status,s.payment_method,s.vendor,u.id,
       CASE WHEN s.status IN ('approved','paid') THEN u.id ELSE NULL END,
       CASE WHEN s.status IN ('approved','paid') THEN NOW() ELSE NULL END,
       CASE WHEN s.status='paid' THEN NOW() ELSE NULL END,u.id
FROM expense_seed s
JOIN expense_categories ec ON ec.code=s.category_code
CROSS JOIN admin_user u
LEFT JOIN branches b ON b.code=s.branch_code
WHERE NOT EXISTS (SELECT 1 FROM expenses e WHERE e.title=s.title);

INSERT INTO expense_status_history(expense_id,old_status,new_status,changed_by,comment)
SELECT e.id,NULL,e.status,u.id,'Demo xarajat yaratildi'
FROM expenses e
CROSS JOIN (SELECT id FROM app_users ORDER BY (role='admin') DESC,id LIMIT 1) u
WHERE e.title IN ('Meta Ads — Chilla yarmarkasi','Chirchiq Reels suratga olish','Canva Pro obunasi','Aksiya bannerlari','LED yoritgich','Filiallar safari','Dizayner xizmat haqi')
  AND NOT EXISTS (SELECT 1 FROM expense_status_history h WHERE h.expense_id=e.id);

INSERT INTO expense_budgets(budget_month,branch_id,category_id,amount,notes,created_by)
SELECT date_trunc('month',CURRENT_DATE)::date,NULL,NULL,25000000,'Joriy oy umumiy SMM byudjeti',u.id
FROM (SELECT id FROM app_users ORDER BY (role='admin') DESC,id LIMIT 1) u
WHERE NOT EXISTS (
  SELECT 1 FROM expense_budgets
  WHERE budget_month=date_trunc('month',CURRENT_DATE)::date AND branch_id IS NULL AND category_id IS NULL
);

COMMIT;

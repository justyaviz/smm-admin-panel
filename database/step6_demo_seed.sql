-- aloo SMM Panel Step 6 demo data
-- Demo user password: aloo2026
BEGIN;

UPDATE branches SET
  address = CASE code
    WHEN 'chirchiq' THEN 'Chirchiq shahri, markaziy savdo hududi'
    WHEN 'parkent' THEN 'Parkent shahri, markaz'
    WHEN 'chinoz' THEN 'Chinoz shahri, bosh ko‘cha'
    ELSE address END,
  phone = CASE code
    WHEN 'chirchiq' THEN '+998 78 122 08 00'
    WHEN 'parkent' THEN '+998 78 122 08 01'
    WHEN 'chinoz' THEN '+998 78 122 08 02'
    ELSE phone END,
  manager_name = CASE code
    WHEN 'chirchiq' THEN 'Azizbek Karimov'
    WHEN 'parkent' THEN 'Dilshod Tursunov'
    WHEN 'chinoz' THEN 'Madina Rasulova'
    ELSE manager_name END,
  monthly_content_target = 40,
  monthly_reach_target = CASE code WHEN 'chirchiq' THEN 250000 WHEN 'parkent' THEN 180000 ELSE 140000 END
WHERE code IN ('chirchiq','parkent','chinoz');

INSERT INTO app_users(full_name,login,password_hash,role,job_title,email,telegram_username,is_active)
SELECT 'Azizbek Karimov','azizbek.demo','$2b$12$YnCE/rx1zVKzBVIG9Jkayual1pxbioEvAKOGkjJqp2tUKnrixHyOa','smm_manager','Filial SMM menejeri','azizbek.demo@aloo.uz','@azizbek_demo',TRUE
WHERE NOT EXISTS (SELECT 1 FROM app_users WHERE LOWER(login)='azizbek.demo');

INSERT INTO app_users(full_name,login,password_hash,role,job_title,email,telegram_username,is_active)
SELECT 'Malika Yusupova','malika.demo','$2b$12$YnCE/rx1zVKzBVIG9Jkayual1pxbioEvAKOGkjJqp2tUKnrixHyOa','designer','Grafik dizayner','malika.demo@aloo.uz','@malika_design',TRUE
WHERE NOT EXISTS (SELECT 1 FROM app_users WHERE LOWER(login)='malika.demo');

INSERT INTO app_users(full_name,login,password_hash,role,job_title,email,telegram_username,is_active)
SELECT 'Bekzod Aliyev','bekzod.demo','$2b$12$YnCE/rx1zVKzBVIG9Jkayual1pxbioEvAKOGkjJqp2tUKnrixHyOa','targetolog','Targetolog','bekzod.demo@aloo.uz','@bekzod_target',TRUE
WHERE NOT EXISTS (SELECT 1 FROM app_users WHERE LOWER(login)='bekzod.demo');

INSERT INTO app_user_branches(user_id,branch_id,is_primary,assigned_by)
SELECT u.id,b.id,TRUE,(SELECT id FROM app_users WHERE role='admin' ORDER BY id LIMIT 1)
FROM app_users u JOIN branches b ON b.code='chirchiq'
WHERE u.login='azizbek.demo'
ON CONFLICT(user_id,branch_id) DO UPDATE SET is_primary=TRUE;

INSERT INTO app_user_branches(user_id,branch_id,is_primary,assigned_by)
SELECT u.id,b.id,TRUE,(SELECT id FROM app_users WHERE role='admin' ORDER BY id LIMIT 1)
FROM app_users u JOIN branches b ON b.code='parkent'
WHERE u.login='malika.demo'
ON CONFLICT(user_id,branch_id) DO UPDATE SET is_primary=TRUE;

INSERT INTO app_user_branches(user_id,branch_id,is_primary,assigned_by)
SELECT u.id,b.id,TRUE,(SELECT id FROM app_users WHERE role='admin' ORDER BY id LIMIT 1)
FROM app_users u JOIN branches b ON b.code='chinoz'
WHERE u.login='bekzod.demo'
ON CONFLICT(user_id,branch_id) DO UPDATE SET is_primary=TRUE;

INSERT INTO branch_social_accounts(branch_id,platform_id,account_name,account_url,followers,is_active)
SELECT b.id,p.id,'@aloo_chirchiq','https://instagram.com/aloo_chirchiq',12400,TRUE
FROM branches b JOIN platforms p ON p.code='instagram' WHERE b.code='chirchiq'
ON CONFLICT(branch_id,platform_id) DO UPDATE SET account_name=EXCLUDED.account_name,account_url=EXCLUDED.account_url,followers=EXCLUDED.followers,is_active=TRUE;

INSERT INTO branch_social_accounts(branch_id,platform_id,account_name,account_url,followers,is_active)
SELECT b.id,p.id,'aloo Chirchiq','https://t.me/aloo_chirchiq',8700,TRUE
FROM branches b JOIN platforms p ON p.code='telegram' WHERE b.code='chirchiq'
ON CONFLICT(branch_id,platform_id) DO UPDATE SET account_name=EXCLUDED.account_name,account_url=EXCLUDED.account_url,followers=EXCLUDED.followers,is_active=TRUE;

INSERT INTO branch_social_accounts(branch_id,platform_id,account_name,account_url,followers,is_active)
SELECT b.id,p.id,'@aloo_parkent','https://instagram.com/aloo_parkent',9200,TRUE
FROM branches b JOIN platforms p ON p.code='instagram' WHERE b.code='parkent'
ON CONFLICT(branch_id,platform_id) DO UPDATE SET account_name=EXCLUDED.account_name,account_url=EXCLUDED.account_url,followers=EXCLUDED.followers,is_active=TRUE;

COMMIT;

-- aloo SMM Panel — PostgreSQL schema (Step 2: Content + Calendar)
-- UTF-8 / PostgreSQL 16+

BEGIN;

CREATE TABLE IF NOT EXISTS app_users (
  id BIGSERIAL PRIMARY KEY,
  full_name VARCHAR(160) NOT NULL,
  login VARCHAR(80) NOT NULL,
  phone VARCHAR(32),
  password_hash TEXT NOT NULL,
  role VARCHAR(40) NOT NULL DEFAULT 'smm_manager',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT app_users_login_nonempty CHECK (length(trim(login)) >= 2),
  CONSTRAINT app_users_role_allowed CHECK (
    role IN ('admin', 'smm_manager', 'targetolog', 'designer', 'mobilograf', 'copywriter', 'analyst', 'viewer')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_app_users_login_lower ON app_users (LOWER(login));
CREATE UNIQUE INDEX IF NOT EXISTS uq_app_users_phone_not_null ON app_users (phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_app_users_active ON app_users (is_active);
CREATE INDEX IF NOT EXISTS idx_app_users_role ON app_users (role);

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES app_users(id) ON DELETE SET NULL,
  action VARCHAR(120) NOT NULL,
  ip_address VARCHAR(80),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at DESC);

CREATE TABLE IF NOT EXISTS platforms (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(30) NOT NULL UNIQUE,
  name VARCHAR(60) NOT NULL,
  color VARCHAR(20) NOT NULL DEFAULT '#1690F5',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS branches (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  region VARCHAR(100),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS content_items (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(220) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  content_type VARCHAR(30) NOT NULL,
  platform_id BIGINT NOT NULL REFERENCES platforms(id) ON DELETE RESTRICT,
  branch_id BIGINT REFERENCES branches(id) ON DELETE SET NULL,
  assigned_to BIGINT REFERENCES app_users(id) ON DELETE SET NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'draft',
  publish_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  cover_url TEXT,
  notes TEXT NOT NULL DEFAULT '',
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_by BIGINT NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT content_title_nonempty CHECK (length(trim(title)) >= 2),
  CONSTRAINT content_type_allowed CHECK (
    content_type IN ('post', 'reels', 'story', 'shorts', 'video', 'carousel', 'banner', 'live')
  ),
  CONSTRAINT content_status_allowed CHECK (
    status IN ('draft', 'review', 'approved', 'scheduled', 'published', 'cancelled')
  )
);

CREATE INDEX IF NOT EXISTS idx_content_items_status ON content_items (status);
CREATE INDEX IF NOT EXISTS idx_content_items_publish_at ON content_items (publish_at);
CREATE INDEX IF NOT EXISTS idx_content_items_platform_id ON content_items (platform_id);
CREATE INDEX IF NOT EXISTS idx_content_items_branch_id ON content_items (branch_id);
CREATE INDEX IF NOT EXISTS idx_content_items_assigned_to ON content_items (assigned_to);
CREATE INDEX IF NOT EXISTS idx_content_items_created_at ON content_items (created_at DESC);

CREATE TABLE IF NOT EXISTS content_status_history (
  id BIGSERIAL PRIMARY KEY,
  content_id BIGINT NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  old_status VARCHAR(30),
  new_status VARCHAR(30) NOT NULL,
  changed_by BIGINT REFERENCES app_users(id) ON DELETE SET NULL,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_content_status_history_content_id ON content_status_history (content_id, created_at DESC);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_app_users_updated_at ON app_users;
CREATE TRIGGER trg_app_users_updated_at
BEFORE UPDATE ON app_users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_branches_updated_at ON branches;
CREATE TRIGGER trg_branches_updated_at
BEFORE UPDATE ON branches
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_content_items_updated_at ON content_items;
CREATE TRIGGER trg_content_items_updated_at
BEFORE UPDATE ON content_items
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO platforms (code, name, color, sort_order) VALUES
  ('instagram', 'Instagram', '#E4405F', 10),
  ('telegram', 'Telegram', '#229ED9', 20),
  ('facebook', 'Facebook', '#1877F2', 30),
  ('youtube', 'YouTube', '#FF0000', 40),
  ('tiktok', 'TikTok', '#111827', 50)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  color = EXCLUDED.color,
  sort_order = EXCLUDED.sort_order,
  is_active = TRUE;

INSERT INTO branches (code, name, region, sort_order) VALUES
  ('chirchiq', 'Chirchiq', 'Toshkent viloyati', 10),
  ('parkent', 'Parkent', 'Toshkent viloyati', 20),
  ('chinoz', 'Chinoz', 'Toshkent viloyati', 30),
  ('piskent', 'Piskent', 'Toshkent viloyati', 40),
  ('angren', 'Angren', 'Toshkent viloyati', 50),
  ('oqqorgon', 'Oqqo‘rg‘on', 'Toshkent viloyati', 60),
  ('qibray', 'Qibray', 'Toshkent viloyati', 70),
  ('gazalkent', 'G‘azalkent', 'Toshkent viloyati', 80),
  ('olmaliq', 'Olmaliq', 'Toshkent viloyati', 90),
  ('guliston', 'Guliston', 'Sirdaryo viloyati', 100),
  ('jarqorgon', 'Jarqo‘rg‘on', 'Surxondaryo viloyati', 110),
  ('sherobod', 'Sherobod', 'Surxondaryo viloyati', 120),
  ('shorchi', 'Sho‘rchi', 'Surxondaryo viloyati', 130)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  region = EXCLUDED.region,
  sort_order = EXCLUDED.sort_order,
  is_active = TRUE;

COMMIT;

-- Birinchi admin backend ishga tushganda environment variables orqali yaratiladi:
-- ADMIN_FULL_NAME, ADMIN_LOGIN, ADMIN_PHONE, ADMIN_PASSWORD

-- Step 3: Campaigns + Target advertising
BEGIN;

CREATE TABLE IF NOT EXISTS campaigns (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(180) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  objective VARCHAR(40) NOT NULL,
  product_direction VARCHAR(160) NOT NULL DEFAULT '',
  manager_id BIGINT REFERENCES app_users(id) ON DELETE SET NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'draft',
  budget NUMERIC(16,2) NOT NULL DEFAULT 0,
  spend NUMERIC(16,2) NOT NULL DEFAULT 0,
  reach BIGINT NOT NULL DEFAULT 0,
  impressions BIGINT NOT NULL DEFAULT 0,
  clicks BIGINT NOT NULL DEFAULT 0,
  video_views BIGINT NOT NULL DEFAULT 0,
  engagement BIGINT NOT NULL DEFAULT 0,
  messages BIGINT NOT NULL DEFAULT 0,
  sales_count INTEGER NOT NULL DEFAULT 0,
  sales_value NUMERIC(16,2) NOT NULL DEFAULT 0,
  start_date DATE,
  end_date DATE,
  created_by BIGINT NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT campaigns_name_nonempty CHECK (length(trim(name)) >= 2),
  CONSTRAINT campaigns_objective_allowed CHECK (
    objective IN ('awareness','traffic','engagement','messages','video_views','sales','promo')
  ),
  CONSTRAINT campaigns_status_allowed CHECK (
    status IN ('draft','planned','active','paused','completed','cancelled')
  ),
  CONSTRAINT campaigns_dates_valid CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date),
  CONSTRAINT campaigns_numbers_nonnegative CHECK (
    budget >= 0 AND spend >= 0 AND reach >= 0 AND impressions >= 0 AND clicks >= 0 AND
    video_views >= 0 AND engagement >= 0 AND messages >= 0 AND sales_count >= 0 AND sales_value >= 0
  )
);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_dates ON campaigns(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_campaigns_manager ON campaigns(manager_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON campaigns(created_at DESC);

CREATE TABLE IF NOT EXISTS campaign_platforms (
  campaign_id BIGINT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  platform_id BIGINT NOT NULL REFERENCES platforms(id) ON DELETE RESTRICT,
  PRIMARY KEY (campaign_id, platform_id)
);
CREATE INDEX IF NOT EXISTS idx_campaign_platforms_platform ON campaign_platforms(platform_id);

CREATE TABLE IF NOT EXISTS campaign_branches (
  campaign_id BIGINT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  branch_id BIGINT NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  PRIMARY KEY (campaign_id, branch_id)
);
CREATE INDEX IF NOT EXISTS idx_campaign_branches_branch ON campaign_branches(branch_id);

CREATE TABLE IF NOT EXISTS target_ads (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(180) NOT NULL,
  campaign_id BIGINT REFERENCES campaigns(id) ON DELETE SET NULL,
  platform_id BIGINT NOT NULL REFERENCES platforms(id) ON DELETE RESTRICT,
  branch_id BIGINT REFERENCES branches(id) ON DELETE SET NULL,
  objective VARCHAR(40) NOT NULL,
  audience VARCHAR(500) NOT NULL DEFAULT '',
  placement VARCHAR(180) NOT NULL DEFAULT 'Automatic placements',
  external_id VARCHAR(120) NOT NULL DEFAULT '',
  status VARCHAR(30) NOT NULL DEFAULT 'draft',
  daily_budget NUMERIC(16,2) NOT NULL DEFAULT 0,
  total_budget NUMERIC(16,2) NOT NULL DEFAULT 0,
  spend NUMERIC(16,2) NOT NULL DEFAULT 0,
  impressions BIGINT NOT NULL DEFAULT 0,
  reach BIGINT NOT NULL DEFAULT 0,
  clicks BIGINT NOT NULL DEFAULT 0,
  messages BIGINT NOT NULL DEFAULT 0,
  sales_count INTEGER NOT NULL DEFAULT 0,
  start_date DATE,
  end_date DATE,
  created_by BIGINT NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT target_ads_name_nonempty CHECK (length(trim(name)) >= 2),
  CONSTRAINT target_ads_objective_allowed CHECK (
    objective IN ('awareness','traffic','engagement','messages','video_views','sales')
  ),
  CONSTRAINT target_ads_status_allowed CHECK (
    status IN ('draft','active','paused','completed','cancelled')
  ),
  CONSTRAINT target_ads_dates_valid CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date),
  CONSTRAINT target_ads_numbers_nonnegative CHECK (
    daily_budget >= 0 AND total_budget >= 0 AND spend >= 0 AND impressions >= 0 AND
    reach >= 0 AND clicks >= 0 AND messages >= 0 AND sales_count >= 0
  )
);
CREATE INDEX IF NOT EXISTS idx_target_ads_status ON target_ads(status);
CREATE INDEX IF NOT EXISTS idx_target_ads_platform ON target_ads(platform_id);
CREATE INDEX IF NOT EXISTS idx_target_ads_branch ON target_ads(branch_id);
CREATE INDEX IF NOT EXISTS idx_target_ads_campaign ON target_ads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_target_ads_dates ON target_ads(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_target_ads_created_at ON target_ads(created_at DESC);

DROP TRIGGER IF EXISTS trg_campaigns_updated_at ON campaigns;
CREATE TRIGGER trg_campaigns_updated_at
BEFORE UPDATE ON campaigns
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_target_ads_updated_at ON target_ads;
CREATE TRIGGER trg_target_ads_updated_at
BEFORE UPDATE ON target_ads
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;

-- Step 4: Analytics + Reports
BEGIN;

CREATE TABLE IF NOT EXISTS analytics_daily_metrics (
  id BIGSERIAL PRIMARY KEY,
  metric_date DATE NOT NULL,
  platform_id BIGINT REFERENCES platforms(id) ON DELETE SET NULL,
  branch_id BIGINT REFERENCES branches(id) ON DELETE SET NULL,
  campaign_id BIGINT REFERENCES campaigns(id) ON DELETE SET NULL,
  ad_id BIGINT REFERENCES target_ads(id) ON DELETE SET NULL,
  content_id BIGINT REFERENCES content_items(id) ON DELETE SET NULL,
  reach BIGINT NOT NULL DEFAULT 0,
  impressions BIGINT NOT NULL DEFAULT 0,
  clicks BIGINT NOT NULL DEFAULT 0,
  engagement BIGINT NOT NULL DEFAULT 0,
  messages BIGINT NOT NULL DEFAULT 0,
  video_views BIGINT NOT NULL DEFAULT 0,
  followers_gained INTEGER NOT NULL DEFAULT 0,
  leads INTEGER NOT NULL DEFAULT 0,
  sales_count INTEGER NOT NULL DEFAULT 0,
  sales_value NUMERIC(16,2) NOT NULL DEFAULT 0,
  spend NUMERIC(16,2) NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  created_by BIGINT NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT analytics_daily_nonnegative CHECK (
    reach >= 0 AND impressions >= 0 AND clicks >= 0 AND engagement >= 0 AND messages >= 0 AND
    video_views >= 0 AND followers_gained >= 0 AND leads >= 0 AND sales_count >= 0 AND
    sales_value >= 0 AND spend >= 0
  )
);
CREATE INDEX IF NOT EXISTS idx_analytics_daily_date ON analytics_daily_metrics(metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_daily_platform ON analytics_daily_metrics(platform_id);
CREATE INDEX IF NOT EXISTS idx_analytics_daily_branch ON analytics_daily_metrics(branch_id);
CREATE INDEX IF NOT EXISTS idx_analytics_daily_campaign ON analytics_daily_metrics(campaign_id);
CREATE INDEX IF NOT EXISTS idx_analytics_daily_ad ON analytics_daily_metrics(ad_id);

CREATE TABLE IF NOT EXISTS report_exports (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(180) NOT NULL,
  report_type VARCHAR(40) NOT NULL DEFAULT 'full',
  format VARCHAR(10) NOT NULL DEFAULT 'xlsx',
  date_from DATE NOT NULL,
  date_to DATE NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(20) NOT NULL DEFAULT 'ready',
  created_by BIGINT NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT report_exports_name_nonempty CHECK (length(trim(name)) >= 2),
  CONSTRAINT report_exports_type_allowed CHECK (
    report_type IN ('full','summary','platforms','branches','campaigns','content')
  ),
  CONSTRAINT report_exports_format_allowed CHECK (format IN ('xlsx','pdf','csv')),
  CONSTRAINT report_exports_status_allowed CHECK (status IN ('ready','failed')),
  CONSTRAINT report_exports_dates_valid CHECK (date_to >= date_from)
);
CREATE INDEX IF NOT EXISTS idx_report_exports_created_at ON report_exports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_report_exports_created_by ON report_exports(created_by);

DROP TRIGGER IF EXISTS trg_analytics_daily_updated_at ON analytics_daily_metrics;
CREATE TRIGGER trg_analytics_daily_updated_at
BEFORE UPDATE ON analytics_daily_metrics
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;

-- Step 5: Media Library
BEGIN;

CREATE TABLE IF NOT EXISTS media_folders (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  color VARCHAR(20) NOT NULL DEFAULT '#1690F5',
  parent_id BIGINT REFERENCES media_folders(id) ON DELETE SET NULL,
  created_by BIGINT NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT media_folders_name_nonempty CHECK (length(trim(name)) >= 2),
  CONSTRAINT media_folders_not_self CHECK (parent_id IS NULL OR parent_id <> id)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_media_folders_parent_name
  ON media_folders (COALESCE(parent_id, 0), LOWER(name));
CREATE INDEX IF NOT EXISTS idx_media_folders_parent ON media_folders(parent_id);

CREATE TABLE IF NOT EXISTS media_assets (
  id BIGSERIAL PRIMARY KEY,
  display_name VARCHAR(220) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_name VARCHAR(255) NOT NULL UNIQUE,
  mime_type VARCHAR(160) NOT NULL,
  media_type VARCHAR(30) NOT NULL,
  extension VARCHAR(20) NOT NULL DEFAULT '',
  size_bytes BIGINT NOT NULL,
  width INTEGER,
  height INTEGER,
  duration_seconds NUMERIC(12,2),
  file_data BYTEA NOT NULL,
  folder_id BIGINT REFERENCES media_folders(id) ON DELETE SET NULL,
  branch_id BIGINT REFERENCES branches(id) ON DELETE SET NULL,
  description TEXT NOT NULL DEFAULT '',
  alt_text VARCHAR(500) NOT NULL DEFAULT '',
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
  download_count INTEGER NOT NULL DEFAULT 0,
  uploaded_by BIGINT NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT media_assets_name_nonempty CHECK (length(trim(display_name)) >= 1),
  CONSTRAINT media_assets_type_allowed CHECK (media_type IN ('image','video','audio','document','other')),
  CONSTRAINT media_assets_status_allowed CHECK (status IN ('active','archived')),
  CONSTRAINT media_assets_size_valid CHECK (size_bytes > 0 AND size_bytes <= 8388608),
  CONSTRAINT media_assets_dimensions_valid CHECK ((width IS NULL OR width > 0) AND (height IS NULL OR height > 0)),
  CONSTRAINT media_assets_download_nonnegative CHECK (download_count >= 0)
);
CREATE INDEX IF NOT EXISTS idx_media_assets_type ON media_assets(media_type);
CREATE INDEX IF NOT EXISTS idx_media_assets_folder ON media_assets(folder_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_branch ON media_assets(branch_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_status ON media_assets(status);
CREATE INDEX IF NOT EXISTS idx_media_assets_favorite ON media_assets(is_favorite) WHERE is_favorite=TRUE;
CREATE INDEX IF NOT EXISTS idx_media_assets_created_at ON media_assets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_assets_tags ON media_assets USING GIN(tags);

CREATE TABLE IF NOT EXISTS media_asset_links (
  id BIGSERIAL PRIMARY KEY,
  asset_id BIGINT NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
  entity_type VARCHAR(30) NOT NULL,
  entity_id BIGINT NOT NULL,
  created_by BIGINT REFERENCES app_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT media_asset_links_type_allowed CHECK (entity_type IN ('content','campaign','ad','report')),
  CONSTRAINT media_asset_links_unique UNIQUE (asset_id, entity_type, entity_id)
);
CREATE INDEX IF NOT EXISTS idx_media_asset_links_entity ON media_asset_links(entity_type, entity_id);

DROP TRIGGER IF EXISTS trg_media_folders_updated_at ON media_folders;
CREATE TRIGGER trg_media_folders_updated_at
BEFORE UPDATE ON media_folders
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_media_assets_updated_at ON media_assets;
CREATE TRIGGER trg_media_assets_updated_at
BEFORE UPDATE ON media_assets
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO media_folders (name,description,color,created_by)
SELECT seed.name, seed.description, seed.color, u.id
FROM (VALUES
  ('Aksiyalar', 'Aksiya va promo materiallari', '#1690F5'),
  ('Mahsulotlar', 'Mahsulot rasmlari va videolari', '#12B76A'),
  ('Filiallar', 'Filiallardan kelgan media fayllar', '#F79009'),
  ('Reels cover', 'Instagram Reels muqovalari', '#E4405F'),
  ('Brend materiallari', 'Logo, guideline va shablonlar', '#6941C6')
) AS seed(name,description,color)
CROSS JOIN LATERAL (SELECT id FROM app_users ORDER BY id LIMIT 1) u
ON CONFLICT DO NOTHING;

COMMIT;

-- Step 6: Branches + Team + Roles & Permissions
BEGIN;

ALTER TABLE branches
  ADD COLUMN IF NOT EXISTS address TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS phone VARCHAR(32),
  ADD COLUMN IF NOT EXISTS manager_name VARCHAR(160) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS manager_phone VARCHAR(32),
  ADD COLUMN IF NOT EXISTS monthly_content_target INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS monthly_reach_target BIGINT NOT NULL DEFAULT 100000,
  ADD COLUMN IF NOT EXISTS notes TEXT NOT NULL DEFAULT '';

ALTER TABLE app_users
  ADD COLUMN IF NOT EXISTS email VARCHAR(180),
  ADD COLUMN IF NOT EXISTS job_title VARCHAR(160) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS telegram_username VARCHAR(100),
  ADD COLUMN IF NOT EXISTS notes TEXT NOT NULL DEFAULT '';

CREATE UNIQUE INDEX IF NOT EXISTS uq_app_users_email_lower_not_null
  ON app_users (LOWER(email)) WHERE email IS NOT NULL;

CREATE TABLE IF NOT EXISTS roles (
  code VARCHAR(40) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  color VARCHAR(20) NOT NULL DEFAULT '#1690F5',
  is_system BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permissions (
  code VARCHAR(80) PRIMARY KEY,
  name VARCHAR(140) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  permission_group VARCHAR(80) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_code VARCHAR(40) NOT NULL REFERENCES roles(code) ON DELETE CASCADE,
  permission_code VARCHAR(80) NOT NULL REFERENCES permissions(code) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (role_code, permission_code)
);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_code);

CREATE TABLE IF NOT EXISTS app_user_branches (
  user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  branch_id BIGINT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by BIGINT REFERENCES app_users(id) ON DELETE SET NULL,
  PRIMARY KEY (user_id, branch_id)
);
CREATE INDEX IF NOT EXISTS idx_app_user_branches_branch ON app_user_branches(branch_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_app_user_primary_branch
  ON app_user_branches(user_id) WHERE is_primary = TRUE;

CREATE TABLE IF NOT EXISTS branch_social_accounts (
  id BIGSERIAL PRIMARY KEY,
  branch_id BIGINT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  platform_id BIGINT NOT NULL REFERENCES platforms(id) ON DELETE RESTRICT,
  account_name VARCHAR(160) NOT NULL DEFAULT '',
  account_url TEXT NOT NULL DEFAULT '',
  followers BIGINT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT branch_social_followers_nonnegative CHECK (followers >= 0),
  CONSTRAINT branch_social_unique UNIQUE (branch_id, platform_id)
);
CREATE INDEX IF NOT EXISTS idx_branch_social_accounts_branch ON branch_social_accounts(branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_social_accounts_platform ON branch_social_accounts(platform_id);

DROP TRIGGER IF EXISTS trg_roles_updated_at ON roles;
CREATE TRIGGER trg_roles_updated_at
BEFORE UPDATE ON roles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_branch_social_accounts_updated_at ON branch_social_accounts;
CREATE TRIGGER trg_branch_social_accounts_updated_at
BEFORE UPDATE ON branch_social_accounts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO roles (code, name, description, color, sort_order) VALUES
  ('admin', 'Administrator', 'Tizimning barcha bo‘limlari va sozlamalariga to‘liq kirish', '#D92D20', 10),
  ('smm_manager', 'SMM Manager', 'Kontent, kampaniya, jamoa va filial ishlarini boshqarish', '#1690F5', 20),
  ('targetolog', 'Targetolog', 'Target reklama, kampaniya va analitika bilan ishlash', '#6941C6', 30),
  ('designer', 'Dizayner', 'Kontent va media materiallari bilan ishlash', '#C11574', 40),
  ('mobilograf', 'Mobilograf', 'Video kontent, kalendar va media bilan ishlash', '#F79009', 50),
  ('copywriter', 'Copywriter', 'Kontent matnlari va rejalari bilan ishlash', '#027A48', 60),
  ('analyst', 'Analitik', 'Analitika va hisobotlarni boshqarish', '#175CD3', 70),
  ('viewer', 'Kuzatuvchi', 'Faqat ko‘rish huquqi', '#667085', 80)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  color = EXCLUDED.color,
  sort_order = EXCLUDED.sort_order;

INSERT INTO permissions (code, name, description, permission_group, sort_order) VALUES
  ('dashboard.view', 'Dashboardni ko‘rish', 'Asosiy ko‘rsatkichlarni ko‘rish', 'Dashboard', 10),
  ('content.view', 'Kontentni ko‘rish', 'Kontent ro‘yxati va detallarini ko‘rish', 'Kontent', 20),
  ('content.create', 'Kontent yaratish', 'Yangi kontent yaratish', 'Kontent', 21),
  ('content.edit', 'Kontentni tahrirlash', 'Mavjud kontentni yangilash', 'Kontent', 22),
  ('content.delete', 'Kontentni o‘chirish', 'Kontentni o‘chirish', 'Kontent', 23),
  ('calendar.view', 'Kalendarni ko‘rish', 'Kontent kalendarini ko‘rish', 'Kontent', 24),
  ('campaigns.view', 'Kampaniyalarni ko‘rish', 'Kampaniya natijalarini ko‘rish', 'Marketing', 30),
  ('campaigns.manage', 'Kampaniyalarni boshqarish', 'Kampaniya yaratish va tahrirlash', 'Marketing', 31),
  ('ads.view', 'Target reklamani ko‘rish', 'Reklamalarni ko‘rish', 'Marketing', 32),
  ('ads.manage', 'Target reklamani boshqarish', 'Reklama yaratish va tahrirlash', 'Marketing', 33),
  ('analytics.view', 'Analitikani ko‘rish', 'Analitika ko‘rsatkichlarini ko‘rish', 'Analitika', 40),
  ('analytics.manage', 'Analitikani boshqarish', 'Kunlik metrikalarni kiritish va tahrirlash', 'Analitika', 41),
  ('reports.view', 'Hisobotlarni ko‘rish', 'Tayyor hisobotlarni ko‘rish va yuklash', 'Analitika', 42),
  ('reports.create', 'Hisobot yaratish', 'PDF, XLSX va CSV hisobot yaratish', 'Analitika', 43),
  ('media.view', 'Mediani ko‘rish', 'Media kutubxonasini ko‘rish', 'Media', 50),
  ('media.manage', 'Mediani boshqarish', 'Media yuklash, tahrirlash va o‘chirish', 'Media', 51),
  ('branches.view', 'Filiallarni ko‘rish', 'Filiallar va ularning natijalarini ko‘rish', 'Tashkilot', 60),
  ('branches.manage', 'Filiallarni boshqarish', 'Filial yaratish va tahrirlash', 'Tashkilot', 61),
  ('team.view', 'Jamoani ko‘rish', 'Xodimlar ro‘yxatini ko‘rish', 'Tashkilot', 62),
  ('team.manage', 'Jamoani boshqarish', 'Xodim yaratish, tahrirlash va bloklash', 'Tashkilot', 63),
  ('roles.manage', 'Rollarni boshqarish', 'Rollar ruxsatlarini o‘zgartirish', 'Tashkilot', 64),
  ('tasks.manage', 'Vazifalarni boshqarish', 'Vazifalar modulini boshqarish', 'Operatsiyalar', 70),
  ('expenses.manage', 'Xarajatlarni boshqarish', 'Xarajatlar modulini boshqarish', 'Operatsiyalar', 71),
  ('chat.use', 'Chatdan foydalanish', 'Ichki chatdan foydalanish', 'Operatsiyalar', 72),
  ('settings.manage', 'Sozlamalarni boshqarish', 'Tizim sozlamalarini o‘zgartirish', 'Sozlamalar', 80)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  permission_group = EXCLUDED.permission_group,
  sort_order = EXCLUDED.sort_order;

-- Administratorga barcha ruxsatlar.
INSERT INTO role_permissions (role_code, permission_code)
SELECT 'admin', code FROM permissions
ON CONFLICT DO NOTHING;

-- SMM manager.
INSERT INTO role_permissions (role_code, permission_code)
SELECT 'smm_manager', code FROM permissions
WHERE code IN (
  'dashboard.view','content.view','content.create','content.edit','content.delete','calendar.view',
  'campaigns.view','campaigns.manage','ads.view','ads.manage','analytics.view','analytics.manage',
  'reports.view','reports.create','media.view','media.manage','branches.view','branches.manage',
  'team.view','team.manage','tasks.manage','expenses.manage','chat.use'
)
ON CONFLICT DO NOTHING;

-- Targetolog.
INSERT INTO role_permissions (role_code, permission_code)
SELECT 'targetolog', code FROM permissions
WHERE code IN ('dashboard.view','campaigns.view','campaigns.manage','ads.view','ads.manage','analytics.view','analytics.manage','reports.view','reports.create','media.view','branches.view','chat.use')
ON CONFLICT DO NOTHING;

-- Dizayner va mobilograf.
INSERT INTO role_permissions (role_code, permission_code)
SELECT role_code, permission_code
FROM (VALUES ('designer'),('mobilograf')) AS r(role_code)
CROSS JOIN LATERAL (
  SELECT code AS permission_code FROM permissions
  WHERE code IN ('dashboard.view','content.view','content.edit','calendar.view','media.view','media.manage','branches.view','tasks.manage','chat.use')
) p
ON CONFLICT DO NOTHING;

-- Copywriter.
INSERT INTO role_permissions (role_code, permission_code)
SELECT 'copywriter', code FROM permissions
WHERE code IN ('dashboard.view','content.view','content.create','content.edit','calendar.view','media.view','branches.view','tasks.manage','chat.use')
ON CONFLICT DO NOTHING;

-- Analitik.
INSERT INTO role_permissions (role_code, permission_code)
SELECT 'analyst', code FROM permissions
WHERE code IN ('dashboard.view','campaigns.view','ads.view','analytics.view','analytics.manage','reports.view','reports.create','branches.view')
ON CONFLICT DO NOTHING;

-- Kuzatuvchi faqat ko‘radi.
INSERT INTO role_permissions (role_code, permission_code)
SELECT 'viewer', code FROM permissions
WHERE code IN ('dashboard.view','content.view','calendar.view','campaigns.view','ads.view','analytics.view','reports.view','media.view','branches.view','team.view')
ON CONFLICT DO NOTHING;

COMMIT;

-- Step 7: Tasks + Expenses
BEGIN;

CREATE TABLE IF NOT EXISTS tasks (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(220) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status VARCHAR(30) NOT NULL DEFAULT 'todo',
  priority VARCHAR(20) NOT NULL DEFAULT 'medium',
  branch_id BIGINT REFERENCES branches(id) ON DELETE SET NULL,
  assigned_to BIGINT REFERENCES app_users(id) ON DELETE SET NULL,
  campaign_id BIGINT REFERENCES campaigns(id) ON DELETE SET NULL,
  content_id BIGINT REFERENCES content_items(id) ON DELETE SET NULL,
  start_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  estimated_minutes INTEGER NOT NULL DEFAULT 0,
  spent_minutes INTEGER NOT NULL DEFAULT 0,
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_by BIGINT NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT tasks_title_nonempty CHECK (length(trim(title)) >= 2),
  CONSTRAINT tasks_status_allowed CHECK (status IN ('backlog','todo','in_progress','review','done','cancelled')),
  CONSTRAINT tasks_priority_allowed CHECK (priority IN ('low','medium','high','urgent')),
  CONSTRAINT tasks_time_nonnegative CHECK (estimated_minutes >= 0 AND spent_minutes >= 0),
  CONSTRAINT tasks_dates_valid CHECK (due_at IS NULL OR start_at IS NULL OR due_at >= start_at)
);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_branch ON tasks(branch_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_at ON tasks(due_at);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_tags ON tasks USING GIN(tags);

CREATE TABLE IF NOT EXISTS task_comments (
  id BIGSERIAL PRIMARY KEY,
  task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT task_comments_body_nonempty CHECK (length(trim(body)) >= 1)
);
CREATE INDEX IF NOT EXISTS idx_task_comments_task ON task_comments(task_id,created_at);

CREATE TABLE IF NOT EXISTS task_status_history (
  id BIGSERIAL PRIMARY KEY,
  task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  old_status VARCHAR(30),
  new_status VARCHAR(30) NOT NULL,
  changed_by BIGINT REFERENCES app_users(id) ON DELETE SET NULL,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_task_status_history_task ON task_status_history(task_id,created_at DESC);

CREATE TABLE IF NOT EXISTS expense_categories (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(60) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  color VARCHAR(20) NOT NULL DEFAULT '#1690F5',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expense_budgets (
  id BIGSERIAL PRIMARY KEY,
  budget_month DATE NOT NULL,
  branch_id BIGINT REFERENCES branches(id) ON DELETE CASCADE,
  category_id BIGINT REFERENCES expense_categories(id) ON DELETE CASCADE,
  amount NUMERIC(16,2) NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  created_by BIGINT NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT expense_budgets_month_first_day CHECK (budget_month = date_trunc('month', budget_month)::date),
  CONSTRAINT expense_budgets_amount_nonnegative CHECK (amount >= 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_expense_budgets_scope
  ON expense_budgets (budget_month, COALESCE(branch_id,0), COALESCE(category_id,0));
CREATE INDEX IF NOT EXISTS idx_expense_budgets_month ON expense_budgets(budget_month);
CREATE INDEX IF NOT EXISTS idx_expense_budgets_branch ON expense_budgets(branch_id);

CREATE TABLE IF NOT EXISTS expenses (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(220) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category_id BIGINT NOT NULL REFERENCES expense_categories(id) ON DELETE RESTRICT,
  branch_id BIGINT REFERENCES branches(id) ON DELETE SET NULL,
  campaign_id BIGINT REFERENCES campaigns(id) ON DELETE SET NULL,
  amount NUMERIC(16,2) NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  payment_method VARCHAR(30) NOT NULL DEFAULT 'transfer',
  vendor VARCHAR(220) NOT NULL DEFAULT '',
  receipt_media_id BIGINT REFERENCES media_assets(id) ON DELETE SET NULL,
  notes TEXT NOT NULL DEFAULT '',
  requested_by BIGINT REFERENCES app_users(id) ON DELETE SET NULL,
  approved_by BIGINT REFERENCES app_users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_by BIGINT NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT expenses_title_nonempty CHECK (length(trim(title)) >= 2),
  CONSTRAINT expenses_amount_positive CHECK (amount > 0),
  CONSTRAINT expenses_status_allowed CHECK (status IN ('draft','pending','approved','paid','rejected','cancelled')),
  CONSTRAINT expenses_payment_allowed CHECK (payment_method IN ('cash','card','transfer','corporate_card','other'))
);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_branch ON expenses(branch_id);
CREATE INDEX IF NOT EXISTS idx_expenses_campaign ON expenses(campaign_id);

CREATE TABLE IF NOT EXISTS expense_status_history (
  id BIGSERIAL PRIMARY KEY,
  expense_id BIGINT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  old_status VARCHAR(30),
  new_status VARCHAR(30) NOT NULL,
  changed_by BIGINT REFERENCES app_users(id) ON DELETE SET NULL,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_expense_status_history_expense ON expense_status_history(expense_id,created_at DESC);

DROP TRIGGER IF EXISTS trg_tasks_updated_at ON tasks;
CREATE TRIGGER trg_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_task_comments_updated_at ON task_comments;
CREATE TRIGGER trg_task_comments_updated_at BEFORE UPDATE ON task_comments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_expense_categories_updated_at ON expense_categories;
CREATE TRIGGER trg_expense_categories_updated_at BEFORE UPDATE ON expense_categories FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_expense_budgets_updated_at ON expense_budgets;
CREATE TRIGGER trg_expense_budgets_updated_at BEFORE UPDATE ON expense_budgets FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_expenses_updated_at ON expenses;
CREATE TRIGGER trg_expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO expense_categories(code,name,color,sort_order) VALUES
  ('target_ads','Target reklama','#6941C6',10),
  ('content_production','Kontent ishlab chiqarish','#1690F5',20),
  ('design','Dizayn','#C11574',30),
  ('equipment','Texnika va jihozlar','#F79009',40),
  ('transport','Transport','#0E9384',50),
  ('printing','Poligrafiya','#175CD3',60),
  ('software','Dastur va servislar','#667085',70),
  ('events','Tadbirlar','#D92D20',80),
  ('other','Boshqa','#98A2B3',90)
ON CONFLICT(code) DO UPDATE SET name=EXCLUDED.name,color=EXCLUDED.color,sort_order=EXCLUDED.sort_order,is_active=TRUE;

INSERT INTO permissions(code,name,description,permission_group,sort_order) VALUES
  ('tasks.view','Vazifalarni ko‘rish','Vazifalar ro‘yxati, izohlar va tarixni ko‘rish','Operatsiyalar',69),
  ('tasks.manage','Vazifalarni boshqarish','Vazifa yaratish, tahrirlash va statusini o‘zgartirish','Operatsiyalar',70),
  ('expenses.view','Xarajatlarni ko‘rish','Xarajatlar, byudjet va tasdiqlash holatini ko‘rish','Operatsiyalar',71),
  ('expenses.manage','Xarajatlarni boshqarish','Xarajat yaratish, tasdiqlash va byudjet belgilash','Operatsiyalar',72)
ON CONFLICT(code) DO UPDATE SET name=EXCLUDED.name,description=EXCLUDED.description,permission_group=EXCLUDED.permission_group,sort_order=EXCLUDED.sort_order;

INSERT INTO role_permissions(role_code,permission_code)
SELECT 'admin',code FROM permissions WHERE code IN ('tasks.view','tasks.manage','expenses.view','expenses.manage')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions(role_code,permission_code)
SELECT 'smm_manager',code FROM permissions WHERE code IN ('tasks.view','tasks.manage','expenses.view','expenses.manage')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions(role_code,permission_code)
SELECT role_code,permission_code
FROM (VALUES ('targetolog'),('designer'),('mobilograf'),('copywriter')) AS r(role_code)
CROSS JOIN LATERAL (
  SELECT code AS permission_code FROM permissions
  WHERE code IN ('tasks.view','tasks.manage')
     OR (r.role_code='targetolog' AND code IN ('expenses.view','expenses.manage'))
) p
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions(role_code,permission_code)
SELECT 'analyst',code FROM permissions WHERE code IN ('tasks.view','expenses.view')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions(role_code,permission_code)
SELECT 'viewer',code FROM permissions WHERE code IN ('tasks.view','expenses.view')
ON CONFLICT DO NOTHING;

COMMIT;

-- Step 8: Internal Chat + Notifications + Settings
BEGIN;

CREATE TABLE IF NOT EXISTS chat_channels (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(140) UNIQUE,
  channel_type VARCHAR(20) NOT NULL DEFAULT 'group',
  direct_key VARCHAR(100) UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  color VARCHAR(20) NOT NULL DEFAULT '#1690F5',
  branch_id BIGINT REFERENCES branches(id) ON DELETE SET NULL,
  created_by BIGINT REFERENCES app_users(id) ON DELETE SET NULL,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chat_channels_type_allowed CHECK (channel_type IN ('general','group','direct','branch')),
  CONSTRAINT chat_channels_name_nonempty CHECK (length(trim(name)) >= 2)
);
CREATE INDEX IF NOT EXISTS idx_chat_channels_last_message ON chat_channels(last_message_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_chat_channels_branch ON chat_channels(branch_id);

CREATE TABLE IF NOT EXISTS chat_channel_members (
  channel_id BIGINT NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  member_role VARCHAR(20) NOT NULL DEFAULT 'member',
  muted BOOLEAN NOT NULL DEFAULT FALSE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(channel_id,user_id),
  CONSTRAINT chat_member_role_allowed CHECK (member_role IN ('owner','admin','member'))
);
CREATE INDEX IF NOT EXISTS idx_chat_channel_members_user ON chat_channel_members(user_id,channel_id);

CREATE TABLE IF NOT EXISTS chat_messages (
  id BIGSERIAL PRIMARY KEY,
  channel_id BIGINT NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
  sender_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  body TEXT NOT NULL DEFAULT '',
  reply_to_id BIGINT REFERENCES chat_messages(id) ON DELETE SET NULL,
  is_edited BOOLEAN NOT NULL DEFAULT FALSE,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chat_message_body_valid CHECK (is_deleted OR length(trim(body)) >= 1)
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_channel ON chat_messages(channel_id,id DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id,created_at DESC);

CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL DEFAULT 'system',
  title VARCHAR(220) NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  link_page VARCHAR(60),
  link_entity_id BIGINT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  dedupe_key VARCHAR(180),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT notifications_title_nonempty CHECK (length(trim(title)) >= 2)
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id,is_read,created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_dedupe
  ON notifications(user_id,dedupe_key) WHERE dedupe_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id BIGINT PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_settings (
  setting_key VARCHAR(100) PRIMARY KEY,
  setting_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT NOT NULL DEFAULT '',
  updated_by BIGINT REFERENCES app_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_chat_channels_updated_at ON chat_channels;
CREATE TRIGGER trg_chat_channels_updated_at BEFORE UPDATE ON chat_channels FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_chat_messages_updated_at ON chat_messages;
CREATE TRIGGER trg_chat_messages_updated_at BEFORE UPDATE ON chat_messages FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER trg_user_preferences_updated_at BEFORE UPDATE ON user_preferences FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_app_settings_updated_at ON app_settings;
CREATE TRIGGER trg_app_settings_updated_at BEFORE UPDATE ON app_settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO chat_channels(name,slug,channel_type,description,color,created_by)
SELECT 'Umumiy chat','general','general','Barcha aloo SMM jamoasi uchun umumiy chat','#1690F5',MIN(id)
FROM app_users
HAVING COUNT(*) > 0
ON CONFLICT(slug) DO UPDATE SET is_archived=FALSE,name=EXCLUDED.name,description=EXCLUDED.description;

INSERT INTO chat_channel_members(channel_id,user_id,member_role,last_read_at)
SELECT c.id,u.id,CASE WHEN u.role='admin' THEN 'admin' ELSE 'member' END,NOW()
FROM chat_channels c CROSS JOIN app_users u
WHERE c.slug='general' AND u.is_active=TRUE
ON CONFLICT(channel_id,user_id) DO NOTHING;

INSERT INTO app_settings(setting_key,setting_value,description)
VALUES('company','{"companyName":"aloo SMM Panel","domain":"aloosmm.uz","supportPhone":"","supportTelegram":"","timezone":"Asia/Tashkent","currency":"UZS","brandColor":"#1690F5","defaultLanguage":"uz"}'::jsonb,'Aloo SMM Panel tashkilot sozlamalari')
ON CONFLICT(setting_key) DO NOTHING;

INSERT INTO user_preferences(user_id,preferences)
SELECT id,'{"language":"uz","timezone":"Asia/Tashkent","dateFormat":"DD.MM.YYYY","compactMode":false,"soundEnabled":true,"desktopEnabled":true,"chatNotifications":true,"taskNotifications":true,"contentNotifications":true,"expenseNotifications":true,"reportNotifications":true}'::jsonb
FROM app_users
ON CONFLICT(user_id) DO NOTHING;

INSERT INTO notifications(user_id,notification_type,title,message,link_page,dedupe_key)
SELECT id,'system','Yangi imkoniyatlar tayyor','Ichki chat, bildirishnomalar va sozlamalar moduli ishga tushdi.','chat','step8-welcome'
FROM app_users WHERE is_active=TRUE
ON CONFLICT(user_id,dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;

INSERT INTO permissions(code,name,description,permission_group,sort_order) VALUES
  ('settings.view','Shaxsiy sozlamalarni ko‘rish','Profil, parol va bildirishnoma sozlamalaridan foydalanish','Sozlamalar',79),
  ('chat.use','Chatdan foydalanish','Ichki chat, guruhlar va shaxsiy suhbatlardan foydalanish','Operatsiyalar',73),
  ('settings.manage','Tizim sozlamalarini boshqarish','Tashkilot va tizim sozlamalarini o‘zgartirish','Sozlamalar',80)
ON CONFLICT(code) DO UPDATE SET name=EXCLUDED.name,description=EXCLUDED.description,permission_group=EXCLUDED.permission_group,sort_order=EXCLUDED.sort_order;

INSERT INTO role_permissions(role_code,permission_code)
SELECT 'admin',code FROM permissions WHERE code IN ('settings.view','chat.use','settings.manage')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions(role_code,permission_code)
SELECT 'smm_manager',code FROM permissions WHERE code IN ('settings.view','chat.use','settings.manage')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions(role_code,permission_code)
SELECT r.code,p.code FROM roles r CROSS JOIN permissions p
WHERE r.code IN ('targetolog','designer','mobilograf','copywriter','analyst','viewer')
  AND p.code='settings.view'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions(role_code,permission_code)
SELECT r.code,p.code FROM roles r CROSS JOIN permissions p
WHERE r.code IN ('targetolog','designer','mobilograf','copywriter','analyst')
  AND p.code='chat.use'
ON CONFLICT DO NOTHING;

COMMIT;

-- Step 10: Productivity, workflow, AI, realtime and PWA support
BEGIN;

ALTER TABLE content_items ADD COLUMN IF NOT EXISTS template_id BIGINT;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname='content_items_template_id_fkey'
  ) THEN
    ALTER TABLE content_items ADD CONSTRAINT content_items_template_id_fkey
      FOREIGN KEY(template_id) REFERENCES content_templates(id) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN undefined_table THEN
  NULL;
END $$;

ALTER TABLE content_items DROP CONSTRAINT IF EXISTS content_status_allowed;
ALTER TABLE content_items ADD CONSTRAINT content_status_allowed CHECK (
  status IN ('draft','review','changes_requested','approved','scheduled','published','cancelled')
);
CREATE INDEX IF NOT EXISTS idx_content_items_deleted_at ON content_items(deleted_at);
CREATE INDEX IF NOT EXISTS idx_content_items_last_activity ON content_items(last_activity_at DESC);

CREATE TABLE IF NOT EXISTS content_templates (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  category VARCHAR(60) NOT NULL DEFAULT 'Umumiy',
  icon VARCHAR(30) NOT NULL DEFAULT 'sparkles',
  title_template VARCHAR(220) NOT NULL DEFAULT '',
  description_template TEXT NOT NULL DEFAULT '',
  content_type VARCHAR(30) NOT NULL DEFAULT 'post',
  platform_code VARCHAR(30) NOT NULL DEFAULT 'instagram',
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by BIGINT REFERENCES app_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT content_templates_type_allowed CHECK(content_type IN ('post','reels','story','shorts','video','carousel','banner','live'))
);
DELETE FROM content_templates a
USING content_templates b
WHERE a.name=b.name AND a.id>b.id;
CREATE UNIQUE INDEX IF NOT EXISTS uq_content_templates_name ON content_templates(name);
CREATE INDEX IF NOT EXISTS idx_content_templates_active ON content_templates(is_active,sort_order,name);
DROP TRIGGER IF EXISTS trg_content_templates_updated_at ON content_templates;
CREATE TRIGGER trg_content_templates_updated_at BEFORE UPDATE ON content_templates FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname='content_items_template_id_fkey'
  ) THEN
    ALTER TABLE content_items ADD CONSTRAINT content_items_template_id_fkey
      FOREIGN KEY(template_id) REFERENCES content_templates(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS content_comments (
  id BIGSERIAL PRIMARY KEY,
  content_id BIGINT NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  body TEXT NOT NULL,
  comment_type VARCHAR(30) NOT NULL DEFAULT 'comment',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT content_comments_body_nonempty CHECK(length(trim(body))>=1),
  CONSTRAINT content_comments_type_allowed CHECK(comment_type IN ('comment','change_request','approval'))
);
CREATE INDEX IF NOT EXISTS idx_content_comments_content ON content_comments(content_id,created_at);

CREATE TABLE IF NOT EXISTS ai_activity_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES app_users(id) ON DELETE SET NULL,
  task VARCHAR(60) NOT NULL,
  prompt TEXT NOT NULL,
  result TEXT NOT NULL,
  provider VARCHAR(30) NOT NULL DEFAULT 'local',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_activity_user ON ai_activity_logs(user_id,created_at DESC);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);
DROP TRIGGER IF EXISTS trg_push_subscriptions_updated_at ON push_subscriptions;
CREATE TRIGGER trg_push_subscriptions_updated_at BEFORE UPDATE ON push_subscriptions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS content_hash VARCHAR(64);
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_media_assets_hash ON media_assets(content_hash) WHERE content_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_media_assets_recent_used ON media_assets(last_used_at DESC NULLS LAST);

INSERT INTO content_templates(name,category,icon,title_template,description_template,content_type,platform_code,tags,sort_order)
VALUES
('Yangi mahsulot','Savdo','package','Yangi mahsulot: [nomi]','Yangi mahsulotimiz bilan tanishing! Asosiy afzalliklar, narx va muddatli to‘lov haqida yozing. CTA: yaqin filialga tashrif buyuring.','post','instagram',ARRAY['yangi','mahsulot'],10),
('Chegirma e’loni','Aksiya','badge-percent','[Aksiya nomi] boshlandi!','Chegirma muddati, eski va yangi narx, filiallar hamda aniq CTA ni kiriting.','post','instagram',ARRAY['aksiya','chegirma'],20),
('Filial aksiyasi','Filial','store','[Filial]da maxsus aksiya','Filial nomi, manzili, aksiya muddati va sovg‘alarni ko‘rsating.','banner','telegram',ARRAY['filial','aksiya'],30),
('Mamnun mijoz','Ishonch','heart-handshake','Mijozimiz fikri','Mijoz tajribasi, qanday mahsulot olgani va nima uchun aloo’ni tanlaganini qisqa yozing.','reels','instagram',ARRAY['mijoz','fikr'],40),
('Reels ssenariysi','Video','clapperboard','[Mavzu] bo‘yicha Reels','HOOK (0–3s)\nKADR 1 (3–8s)\nKADR 2 (8–18s)\nISBOT/NARX (18–25s)\nCTA (25–30s)','reels','instagram',ARRAY['reels','ssenariy'],50),
('Story savol-javob','Interaktiv','message-circle-question','Sizningcha...?','1-story: savol\n2-story: variantlar\n3-story: to‘g‘ri javob yoki mahsulot foydasi\n4-story: CTA','story','instagram',ARRAY['story','savol'],60),
('YouTube obzor','Video','youtube','[Mahsulot] to‘liq obzor','Kirish, dizayn, xususiyatlar, real test, kimga mos, narx va yakuniy xulosa.','video','youtube',ARRAY['youtube','obzor'],70),
('Telegram e’lon','E’lon','send','Muhim yangilik','Qisqa sarlavha, 3 ta asosiy foyda, manzil/aloqa va CTA.','post','telegram',ARRAY['telegram','elon'],80)
ON CONFLICT (name) DO UPDATE SET
  category=EXCLUDED.category,
  icon=EXCLUDED.icon,
  title_template=EXCLUDED.title_template,
  description_template=EXCLUDED.description_template,
  content_type=EXCLUDED.content_type,
  platform_code=EXCLUDED.platform_code,
  tags=EXCLUDED.tags,
  sort_order=EXCLUDED.sort_order,
  is_active=TRUE;

INSERT INTO permissions(code,name,description,permission_group,sort_order) VALUES
('ai.use','AI yordamchidan foydalanish','Caption, hook, ssenariy, tarjima va g‘oyalar yaratish','Kontent',33),
('templates.manage','Kontent shablonlarini boshqarish','Shablon yaratish, tahrirlash va o‘chirish','Kontent',34)
ON CONFLICT(code) DO UPDATE SET name=EXCLUDED.name,description=EXCLUDED.description,permission_group=EXCLUDED.permission_group,sort_order=EXCLUDED.sort_order;

INSERT INTO role_permissions(role_code,permission_code)
SELECT r.code,p.code FROM roles r CROSS JOIN permissions p
WHERE p.code='ai.use' AND r.code IN ('admin','smm_manager','targetolog','designer','mobilograf','copywriter','analyst')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions(role_code,permission_code)
SELECT r.code,p.code FROM roles r CROSS JOIN permissions p
WHERE p.code='templates.manage' AND r.code IN ('admin','smm_manager')
ON CONFLICT DO NOTHING;

UPDATE user_preferences
SET preferences = preferences || '{"theme":"system","reducedMotion":false,"offlineDrafts":true,"smartNotifications":true}'::jsonb;

COMMIT;

-- Step 10.1: media kutubxonasidan kontentga bir bosishda cover biriktirish
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS cover_media_id BIGINT;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname='content_items_cover_media_id_fkey'
  ) THEN
    ALTER TABLE content_items
      ADD CONSTRAINT content_items_cover_media_id_fkey
      FOREIGN KEY (cover_media_id) REFERENCES media_assets(id) ON DELETE SET NULL;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_content_items_cover_media_id ON content_items(cover_media_id);

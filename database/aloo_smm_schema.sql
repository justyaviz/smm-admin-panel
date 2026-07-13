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

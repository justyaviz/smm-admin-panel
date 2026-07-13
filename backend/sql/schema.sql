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

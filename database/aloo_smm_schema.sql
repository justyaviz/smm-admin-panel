-- aloo SMM Panel — PostgreSQL schema
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

CREATE UNIQUE INDEX IF NOT EXISTS uq_app_users_login_lower
  ON app_users (LOWER(login));

CREATE UNIQUE INDEX IF NOT EXISTS uq_app_users_phone_not_null
  ON app_users (phone)
  WHERE phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_app_users_active
  ON app_users (is_active);

CREATE INDEX IF NOT EXISTS idx_app_users_role
  ON app_users (role);

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES app_users(id) ON DELETE SET NULL,
  action VARCHAR(120) NOT NULL,
  ip_address VARCHAR(80),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id
  ON audit_logs (user_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action
  ON audit_logs (action);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
  ON audit_logs (created_at DESC);

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
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

COMMIT;

-- Birinchi admin backend ishga tushganda quyidagi environment variables orqali yaratiladi:
-- ADMIN_FULL_NAME, ADMIN_LOGIN, ADMIN_PHONE, ADMIN_PASSWORD
-- Parolni SQL ichida ochiq matn shaklida saqlamang.

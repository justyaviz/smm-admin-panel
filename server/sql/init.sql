DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS uploads CASCADE;
DROP TABLE IF EXISTS bonus_items CASCADE;
DROP TABLE IF EXISTS bonuses CASCADE;
DROP TABLE IF EXISTS daily_branch_reports CASCADE;
DROP TABLE IF EXISTS campaigns CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS content_items CASCADE;
DROP TABLE IF EXISTS social_accounts CASCADE;
DROP TABLE IF EXISTS branches CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS app_settings CASCADE;

CREATE TABLE app_settings (
  id SERIAL PRIMARY KEY,
  company_name TEXT NOT NULL DEFAULT 'aloo',
  platform_name TEXT NOT NULL DEFAULT 'aloo do‘konlar tarmog‘i SMM jamoasi yagona ma’lumotlar platformasi',
  department_name TEXT NOT NULL DEFAULT 'SMM department',
  theme_default TEXT NOT NULL DEFAULT 'dark',
  website_url TEXT,
  telegram_url TEXT,
  instagram_url TEXT,
  youtube_url TEXT,
  facebook_url TEXT,
  tiktok_url TEXT,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  login TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer',
  avatar_url TEXT,
  department_role TEXT,
  permissions_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE branches (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT,
  manager_name TEXT,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE social_accounts (
  id SERIAL PRIMARY KEY,
  platform TEXT NOT NULL,
  account_name TEXT,
  account_url TEXT,
  login_name TEXT,
  status TEXT NOT NULL DEFAULT 'inactive',
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE content_items (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT '',
  content_type TEXT NOT NULL DEFAULT 'post',
  status TEXT NOT NULL DEFAULT 'reja',
  publish_date DATE,
  assigned_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  video_editor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  video_face_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL,
  bonus_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  proposal_count INTEGER NOT NULL DEFAULT 0,
  approved_count INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  plan_month TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo',
  priority TEXT NOT NULL DEFAULT 'medium',
  due_date DATE,
  assignee_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE campaigns (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  platform TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  budget NUMERIC(14,2) NOT NULL DEFAULT 0,
  spend NUMERIC(14,2) NOT NULL DEFAULT 0,
  leads INTEGER NOT NULL DEFAULT 0,
  sales INTEGER NOT NULL DEFAULT 0,
  ctr NUMERIC(8,2) NOT NULL DEFAULT 0,
  revenue_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  cpa NUMERIC(14,2) NOT NULL DEFAULT 0,
  roi NUMERIC(14,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE daily_branch_reports (
  id SERIAL PRIMARY KEY,
  report_date DATE NOT NULL,
  branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  stories_count INTEGER NOT NULL DEFAULT 0,
  posts_count INTEGER NOT NULL DEFAULT 0,
  reels_count INTEGER NOT NULL DEFAULT 0,
  calls_count INTEGER NOT NULL DEFAULT 0,
  walkin_count INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (report_date, branch_id)
);

CREATE TABLE bonuses (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month_label TEXT NOT NULL,
  total_units INTEGER NOT NULL DEFAULT 0,
  unit_price NUMERIC(14,2) NOT NULL DEFAULT 25000,
  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  kpi_score NUMERIC(6,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, month_label)
);

CREATE TABLE bonus_items (
  id SERIAL PRIMARY KEY,
  month_label TEXT NOT NULL,
  work_date DATE NOT NULL,
  branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL,
  content_type TEXT NOT NULL DEFAULT 'post',
  content_title TEXT,
  notes TEXT,
  proposal_count INTEGER NOT NULL DEFAULT 0,
  approved_count INTEGER NOT NULL DEFAULT 0,
  proposal_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  approved_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  video_editor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  video_face_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE uploads (
  id SERIAL PRIMARY KEY,
  file_name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  file_url TEXT NOT NULL,
  entity_type TEXT,
  entity_id INTEGER,
  uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id INTEGER,
  meta JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_content_publish_date ON content_items(publish_date);
CREATE INDEX idx_content_plan_month ON content_items(plan_month);
CREATE INDEX idx_bonus_items_work_date ON bonus_items(work_date);
CREATE INDEX idx_bonus_items_month_label ON bonus_items(month_label);
CREATE INDEX idx_daily_reports_date ON daily_branch_reports(report_date);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read);

INSERT INTO app_settings (
  company_name,
  platform_name,
  department_name,
  theme_default
) VALUES (
  'aloo',
  'aloo do‘konlar tarmog‘i SMM jamoasi yagona ma’lumotlar platformasi',
  'SMM department',
  'dark'
);

INSERT INTO users (
  full_name,
  phone,
  login,
  password_hash,
  role,
  department_role,
  permissions_json,
  is_active
) VALUES (
  'Asosiy administrator',
  '998939000',
  'admin',
  '$2b$10$1w2I1nA5P0nXkHfA4fRrU.6s7n2lTnV5h2g7xqN1pJt4m4Xw5D8sG',
  'admin',
  'Administrator',
  '["dashboard","content","bonus","dailyReports","campaigns","uploads","users","tasks","audit","profile","settings"]'::jsonb,
  TRUE
);

INSERT INTO branches (name, city) VALUES
('Angren', 'Angren'),
('Chirchiq', 'Chirchiq'),
('Olmaliq', 'Olmaliq'),
('Qibray', 'Qibray'),
('Parkent', 'Parkent');

INSERT INTO social_accounts (platform, status) VALUES
('Telegram', 'active'),
('Instagram', 'active'),
('YouTube', 'inactive'),
('Facebook', 'inactive'),
('TikTok', 'inactive');

DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS uploads CASCADE;
DROP TABLE IF EXISTS contest_expenses CASCADE;
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
  rubric TEXT NOT NULL DEFAULT 'rubrika-yoq',
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
  final_url TEXT,
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
  branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL,
  start_date DATE,
  end_date DATE,
  daily_budget NUMERIC(14,2) NOT NULL DEFAULT 0,
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
  telegram_started_at TIMESTAMP,
  telegram_ended_at TIMESTAMP,
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
  subscriber_count INTEGER NOT NULL DEFAULT 0,
  condition_text TEXT,
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
  work_url TEXT,
  notes TEXT,
  proposal_count INTEGER NOT NULL DEFAULT 0,
  approved_count INTEGER NOT NULL DEFAULT 0,
  proposal_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  approved_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  difficulty_level TEXT NOT NULL DEFAULT 'normal',
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  video_editor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  video_face_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  approval_status TEXT NOT NULL DEFAULT 'draft',
  approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP,
  myseone_item_id INTEGER,
  myseone_synced_title TEXT,
  myseone_sync_status TEXT NOT NULL DEFAULT 'pending',
  myseone_sync_error TEXT,
  myseone_synced_at TIMESTAMP,
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

CREATE TABLE contest_expenses (
  id SERIAL PRIMARY KEY,
  expense_date DATE NOT NULL,
  contest_name TEXT NOT NULL,
  prize_name TEXT NOT NULL,
  prize_image_url TEXT,
  winner_location TEXT,
  winner_region TEXT NOT NULL,
  winner_name TEXT NOT NULL,
  winner_phone TEXT NOT NULL,
  proof_image_url TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
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

CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  sender_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
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
  '["dashboard","content","bonus","dailyReports","campaigns","uploads","users","tasks","audit","profile","settings","chat","content_create","content_edit","content_delete","bonus_create","bonus_edit","bonus_delete","dailyReports_create","dailyReports_edit","dailyReports_delete","campaigns_create","campaigns_edit","campaigns_delete","uploads_create","uploads_delete","users_create","users_edit","users_delete","tasks_create","tasks_edit","tasks_delete"]'::jsonb,
  TRUE
);

INSERT INTO branches (name, city) VALUES
('Bosh ofis', 'Bosh ofis'),
('Ohangaron', 'Ohangaron'),
('Angren', 'Angren'),
('Chirchiq', 'Chirchiq'),
('Guliston', 'Guliston'),
('Jarqo''rg''on', 'Jarqo''rg''on'),
('Sherobod', 'Sherobod'),
('Qibray', 'Qibray'),
('G''azalkent', 'G''azalkent'),
('Olmaliq', 'Olmaliq'),
('Piskent', 'Piskent'),
('Oqqo''rg''on', 'Oqqo''rg''on'),
('Chinoz', 'Chinoz'),
('Sho''rchi', 'Sho''rchi'),
('Parkent', 'Parkent');

INSERT INTO social_accounts (platform, status) VALUES
('Telegram', 'active'),
('Instagram', 'active'),
('YouTube', 'inactive'),
('Facebook', 'inactive'),
('TikTok', 'inactive');

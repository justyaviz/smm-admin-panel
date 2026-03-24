CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  login TEXT,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'admin',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS content (
  id SERIAL PRIMARY KEY,
  title TEXT,
  platform TEXT,
  publish_date TEXT,
  status TEXT,
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shooting (
  id SERIAL PRIMARY KEY,
  project_name TEXT,
  location TEXT,
  shoot_date TEXT,
  owner TEXT,
  status TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS design (
  id SERIAL PRIMARY KEY,
  name TEXT,
  design_type TEXT,
  owner TEXT,
  deadline TEXT,
  status TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS social (
  id SERIAL PRIMARY KEY,
  platform TEXT,
  url TEXT,
  login_name TEXT,
  status TEXT,
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ads (
  id SERIAL PRIMARY KEY,
  campaign_name TEXT,
  budget TEXT,
  start_date TEXT,
  end_date TEXT,
  result TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reports (
  id SERIAL PRIMARY KEY,
  period_name TEXT,
  owner TEXT,
  reach_count TEXT DEFAULT '0',
  lead_count TEXT DEFAULT '0',
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bonus (
  id SERIAL PRIMARY KEY,
  employee_name TEXT,
  position TEXT,
  score TEXT DEFAULT '0',
  bonus_amount TEXT DEFAULT '0',
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  task_name TEXT,
  assignee TEXT,
  deadline TEXT,
  status TEXT,
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS branches (
  id SERIAL PRIMARY KEY,
  branch_name TEXT,
  city TEXT,
  manager TEXT,
  phone TEXT,
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS team (
  id SERIAL PRIMARY KEY,
  name TEXT,
  role TEXT,
  phone TEXT,
  login TEXT,
  password TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS media (
  id SERIAL PRIMARY KEY,
  name TEXT,
  category TEXT,
  file_size TEXT,
  url TEXT,
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY,
  company_name TEXT DEFAULT 'aloo',
  department TEXT DEFAULT 'SMM department',
  website TEXT DEFAULT '',
  telegram TEXT DEFAULT '',
  instagram TEXT DEFAULT '',
  youtube TEXT DEFAULT '',
  facebook TEXT DEFAULT '',
  tiktok TEXT DEFAULT '',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO settings (id, company_name, department)
VALUES (1, 'aloo', 'SMM department')
ON CONFLICT (id) DO NOTHING;

# aloo SMM Admin Panel — Final full-stack package

## What is included
- `client/` — React + Vite frontend
- `server/` — Express + PostgreSQL backend
- `server/sql/init.sql` — database schema
- `server/.env.example` — environment variables example

## Default admin login
- phone/login: `998939000` or `admin`
- password: `12345678`

The admin user is auto-created by the backend on first start.

## Railway deployment

### 1) PostgreSQL
Create a Postgres service in Railway.

Open the DB and run the SQL from:
- `server/sql/init.sql`

### 2) Backend service
Create a new Railway service from the same repo.

Set:
- Root Directory: `server`
- Build Command: `npm install`
- Start Command: `npm start`

Variables:
- `DATABASE_URL` = value from Railway Postgres Variables tab
- `JWT_SECRET` = any long secret string
- `PORT` = `8080`
- `CLIENT_URL` = frontend domain
- `NODE_ENV` = `production`

Generate a public domain.

### 3) Frontend service
Create another Railway service from the same repo.

Set:
- Root Directory: `client`
- Build Command: `npm install && npm run build`
- Start Command: `npm run preview`

Variable:
- `VITE_API_BASE` = backend public domain, for example `https://your-api.up.railway.app`

Generate a public domain.

## Main features
- real login with JWT
- roles: admin/manager/editor/viewer
- PostgreSQL storage across devices
- settings saved to DB
- CRUD for content, tasks, reports, branches, social accounts, team
- uploads API and media table
- bonus auto-recalculation from real data
- Excel export for content/reports/bonus
- PDF export for content/reports
- dark/light mode
- password change
- audit log API

## Notes
- frontend uses the backend API, so data is shared across devices
- uploads are stored in `server/uploads`; on production use a persistent volume
- this package is production-oriented, but you should still review security and backups before heavy use

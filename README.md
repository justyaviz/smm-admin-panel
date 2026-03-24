# aloo SMM Admin Panel — Full ZIP Project

Bu loyiha 2 qismdan iborat:

- `client/` — React + Vite frontend
- `server/` — Express + PostgreSQL backend

## Login

- Telefon: `998939000`
- Parol: `12345678`

Backend birinchi ishga tushganda shu adminni avtomatik yaratadi.

## GitHub ga yuklash

`smm-admin-panel` repongiz ichiga shu ZIP ichidagi `client` va `server` papkalarni yuklang.

## Railway deploy

### 1) Postgres qo‘shing
Railway project ichida PostgreSQL service yarating.

### 2) SQL init ishlating
Railway Postgres ichidagi query oynaga `server/sql/init.sql` ichidagi SQL ni joylang va ishga tushiring.

### 3) Backend deploy
- New Service → GitHub Repo
- Root Directory: `server`
- Variables:
  - `DATABASE_URL` → Railway Postgres connection string
  - `JWT_SECRET` → o‘zingiz xohlagan secret
  - `ADMIN_PHONE=998939000`
  - `ADMIN_PASSWORD=12345678`
  - `CLIENT_URL=*`

### 4) Frontend deploy
- New Service → GitHub Repo
- Root Directory: `client`
- Variables:
  - `VITE_API_URL` → backend service public URL

## Build / Start

### Frontend
- Build: `npm install && npm run build`
- Start: `npm run preview`
- Target port: `8080`

### Backend
- Build: `npm install`
- Start: `npm start`
- Target port: `8080`

## Bo‘limlar

- Dashboard
- Kontent reja
- Syomka
- Dizayn markazi
- Ijtimoiy tarmoqlar
- Reklama kampaniyalari
- Hisobotlar
- Bonus tizimi
- Vazifalar
- Filiallar
- Jamoa
- Media kutubxona
- Sozlamalar

## Eslatma

Bu loyiha productionga yaqin ishlaydi, lekin keyingi bosqichda quyilarni kuchaytirish mumkin:
- role system
- file upload
- Excel export
- audit log
- stronger permissions

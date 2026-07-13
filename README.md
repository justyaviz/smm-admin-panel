# aloo SMM Panel — Login va Dashboard

Railway uchun tayyor monorepo:

- `frontend/` — React + Vite, login va dashboard
- `backend/` — Express API, JWT va PostgreSQL
- `database/aloo_smm_schema.sql` — to‘liq PostgreSQL schema
- `RAILWAY_SETUP.md` — deploy ko‘rsatmasi

## Local ishga tushirish

PostgreSQL:

```bash
docker compose up -d
```

Backend:

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Frontend:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Production

Railway sozlamalari `RAILWAY_SETUP.md` ichida.

Frontend productionda `API_URL` variable’ni runtime vaqtida oladi. Shu sabab `Failed to fetch` muammosi oldini olinadi.

## Healthcheck v2
Backend portni migratsiyadan oldin ochadi. Railway `/health` orqali liveness tekshiradi, `/ready` esa PostgreSQL readiness holatini ko‘rsatadi. Batafsil: `RAILWAY_HEALTHCHECK_FIX.md`.


## Login fix v1.3.0

- Frontend `/api/*` so‘rovlarini backendga server-side proxy qiladi.
- Backend admin parolini Railway `ADMIN_PASSWORD` qiymati bilan har deployda sinxronlaydi.
- Minimal admin parol uzunligi: 6 belgi.
- Standart test login: `admin` / `123456`.
- Railway frontend variable: `API_URL=https://BACKEND-DOMAIN.up.railway.app`.

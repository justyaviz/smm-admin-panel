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

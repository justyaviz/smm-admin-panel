# Aloo SMM Admin Panel

Monorepo tarkibi:

- `client/` - React + Vite admin panel
- `server/` - Express + PostgreSQL API

## Ishga tushirish

### 1. Backend

`server/.env.example` asosida `.env` yarating va qiymatlarni to'ldiring.

```bash
cd server
npm install
npm start
```

Muhim env o'zgaruvchilar:

- `PORT`
- `JWT_SECRET`
- `DATABASE_URL`
- `CLIENT_URL`

Ixtiyoriy:

- `DB_CONNECT_TIMEOUT_MS` - PostgreSQL ulanish timeout'i, default `10000`

### 2. Frontend

```bash
cd client
npm install
npm run dev
```

Ixtiyoriy:

- `VITE_API_BASE=http://localhost:8080`

## Tekshiruv

Frontend production build:

```bash
cd client
npm run build
```

Backend sintaksis tekshiruvi:

```bash
cd server
node --check src/server.js
```

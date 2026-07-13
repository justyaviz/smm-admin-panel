# aloo SMM Panel — Login + Dashboard + Backend + PostgreSQL

Railway uchun tayyor monorepo:

```text
aloo-smm-panel-full/
├── frontend/   # React + Vite, login va dashboard
├── backend/    # Express API, JWT, PostgreSQL
├── docker-compose.yml
└── RAILWAY_SETUP.md
```

## Mahalliy ishga tushirish

### 1. PostgreSQL

```bash
docker compose up -d postgres
```

### 2. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Backend: `http://localhost:3000`

### 3. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Frontend: `http://localhost:5173`

Standart mahalliy login `.env.example` ichida:

```text
login: admin
parol: aloo2026
```

Productionda `ADMIN_PASSWORD` va `JWT_SECRET` qiymatlarini albatta almashtiring.

## Railway

To‘liq qadamlar: [RAILWAY_SETUP.md](./RAILWAY_SETUP.md)

## Font

Gilroy fayllari arxivga kiritilmagan. Litsenziyalangan font fayllarini `frontend/public/fonts/` ichiga README ko‘rsatmasidagi nomlarda joylashtiring.

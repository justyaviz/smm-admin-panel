# aloo SMM Panel v2.0

Aloo do‘konlar tarmog‘i uchun Railway monorepo:

- `frontend/` — React + Vite, Login, Dashboard, Kontent va Kalendar
- `backend/` — Express API, JWT, PostgreSQL va audit log
- `database/` — schema va ixtiyoriy demo ma’lumot

Batafsil ko‘rsatma: `STEP2_CONTENT_CALENDAR.md`

## Mahalliy ishga tushirish

```bash
docker compose up --build
```

Frontend: `http://localhost:8080`
Backend: `http://localhost:3000`

## Login

Login va parol Railway backend Variables ichidagi `ADMIN_LOGIN` va `ADMIN_PASSWORD` orqali boshqariladi.

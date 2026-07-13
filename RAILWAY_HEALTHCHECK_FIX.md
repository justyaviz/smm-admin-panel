# Railway Healthcheck Fix

Bu versiyada backend HTTP server avval `PORT` da ishga tushadi, keyin PostgreSQL migratsiyasi fon rejimida bajariladi.

- `/health` — Railway liveness endpoint, har doim HTTP 200.
- `/ready` — PostgreSQL va migratsiyalar tayyor bo‘lsa HTTP 200, aks holda 503.

## Backend Variables

```env
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=kamida-32-belgilik-juda-maxfiy-kalit
JWT_EXPIRES_IN=12h
CORS_ORIGIN=https://FRONTEND-DOMAIN.up.railway.app,https://aloosmm.uz
ADMIN_FULL_NAME=Aloo Admin
ADMIN_LOGIN=admin
ADMIN_PHONE=998901234567
ADMIN_PASSWORD=kamida-10-belgilik-parol
```

## Railway Settings

- Root Directory: `/backend`
- Config File Path: `/backend/railway.toml`
- Healthcheck Path: `/health`

Deploydan keyin tekshiring:

- `https://BACKEND-DOMAIN/health` — servis tirikligini ko‘rsatadi.
- `https://BACKEND-DOMAIN/ready` — database tayyorligini ko‘rsatadi.

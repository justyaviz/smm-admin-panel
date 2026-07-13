# Railway Docker build fix

Bu versiya frontend va backend servislarini Railpack auto-install jarayonidan chiqarib, Dockerfile orqali build qiladi.
Shuning uchun GitHub repository ichida eski `package-lock.json` qolib ketgan bo'lsa ham deploy buzilmaydi.

## Railway sozlamalari

Frontend service:
- Root Directory: `/frontend`
- Config path: `/frontend/railway.toml`

Backend service:
- Root Directory: `/backend`
- Config path: `/backend/railway.toml`

## Variables

Frontend:
- `VITE_API_URL=https://api.aloosmm.uz`

Backend:
- `DATABASE_URL=${{Postgres.DATABASE_URL}}`
- `JWT_SECRET=<uzun-maxfiy-kalit>`
- `CORS_ORIGIN=https://aloosmm.uz`
- `NODE_ENV=production`

## Redeploy

GitHub'ga shu versiyani yuklagandan keyin Railway'da har ikkala service uchun `Clear build cache and redeploy` bajaring.

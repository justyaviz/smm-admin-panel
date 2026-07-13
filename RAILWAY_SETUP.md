# aloo SMM Panel — Railway sozlash

## 1. GitHub tuzilmasi

ZIP ichidagi fayllarni repository ildiziga yuklang:

```text
/frontend
/backend
/database
```

Eski `frontend/package-lock.json` va `backend/package-lock.json` repositoryda qolmasin.

## 2. PostgreSQL

Railway canvas ichida `Postgres` servis yarating.

Backend jadvallarni ishga tushishda avtomatik yaratadi. Qo‘lda yaratish kerak bo‘lsa:

```text
database/aloo_smm_schema.sql
```

faylini PostgreSQL Query oynasida bajaring.

## 3. Backend servisi

Settings:

```text
Root Directory: /backend
Config File Path: /backend/railway.toml
```

Variables:

```env
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=BU_YERGA_KAMIDA_32_BELGILI_JUDA_MAXFIY_KALIT
JWT_EXPIRES_IN=12h
CORS_ORIGIN=https://FRONTEND-DOMAIN.up.railway.app,https://aloosmm.uz
ADMIN_FULL_NAME=Aloo Admin
ADMIN_LOGIN=admin
ADMIN_PHONE=998901234567
ADMIN_PASSWORD=aloo-admin-2026-kuchli
```

`Postgres` nomi canvasdagi database service nomi bilan bir xil bo‘lishi kerak.

Backend → Settings → Networking → Generate Domain.

Tekshiruv:

```text
https://BACKEND-DOMAIN.up.railway.app/health
```

Natija:

```json
{"ok":true}
```

## 4. Frontend servisi

Settings:

```text
Root Directory: /frontend
Config File Path: /frontend/railway.toml
```

Variables:

```env
API_URL=https://BACKEND-DOMAIN.up.railway.app
```

Custom backend domeni ulangach:

```env
API_URL=https://api.aloosmm.uz
```

Frontenddagi API manzili runtime vaqtida `/runtime-config.js` orqali olinadi. Variable almashtirilganda yangi deploy yoki restart yetarli; Vite build ichiga hardcode qilinmaydi.

Frontend → Settings → Networking → Generate Domain.

Tekshiruv:

```text
https://FRONTEND-DOMAIN.up.railway.app/health
```

Natijada `apiConfigured: true` bo‘lishi kerak.

## 5. Deploy tartibi

1. PostgreSQL servis tayyor bo‘lsin.
2. Backendni deploy qiling.
3. Backend `/health` endpointini tekshiring.
4. Frontendga `API_URL` qo‘ying.
5. Backenddagi `CORS_ORIGIN`ga frontend domenini kiriting.
6. Avval backendni, keyin frontendni redeploy qiling.
7. `ADMIN_LOGIN` va `ADMIN_PASSWORD` bilan kiring.

## 6. Custom domenlar

```text
aloosmm.uz      → frontend
api.aloosmm.uz  → backend
```

Backend variable:

```env
CORS_ORIGIN=https://aloosmm.uz,https://www.aloosmm.uz
```

Frontend variable:

```env
API_URL=https://api.aloosmm.uz
```

# Railway healthcheck va login fix

Backend portni migratsiyadan oldin ochadi va `/health` endpointi darhol `200 OK` qaytaradi.
Database holati `/ready` orqali tekshiriladi.

## Backend variables

```env
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=kamida-32-belgilik-doimiy-maxfiy-kalit
CORS_ORIGIN=https://FRONTEND-DOMAIN.up.railway.app
ADMIN_FULL_NAME=Aloo Admin
ADMIN_LOGIN=admin
ADMIN_PASSWORD=123456
```

Bu versiyada minimal parol uzunligi 6 belgi. Backend har deployda mavjud `admin` foydalanuvchining parolini Railway'dagi `ADMIN_PASSWORD` qiymatiga yangilaydi.

## Frontend variable

```env
API_URL=https://BACKEND-DOMAIN.up.railway.app
```

Frontend browserdan backendga to‘g‘ridan-to‘g‘ri murojaat qilmaydi. `/api/*` so‘rovlari frontend Node server orqali backendga proxy qilinadi.

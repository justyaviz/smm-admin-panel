# Login fix — Railway

Bu versiya ikki asosiy muammoni tuzatadi:

1. Frontend API so‘rovlarini same-origin `/api/*` orqali yuboradi va frontend Node server backendga proxy qiladi. Shu sabab browser CORS yoki noto‘g‘ri build-time URL tufayli `Failed to fetch` chiqmaydi.
2. Backend har ishga tushganda `ADMIN_LOGIN` bo‘yicha adminni yaratadi yoki mavjud admin parolini `ADMIN_PASSWORD` qiymatiga yangilaydi.

## Railway variables

### Backend

```env
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=kamida-32-belgilik-doimiy-maxfiy-kalit
CORS_ORIGIN=https://SIZNING-FRONTEND-DOMENINGIZ.up.railway.app
ADMIN_FULL_NAME=Aloo Admin
ADMIN_LOGIN=admin
ADMIN_PASSWORD=123456
```

### Frontend

```env
API_URL=https://SIZNING-BACKEND-DOMENINGIZ.up.railway.app
```

## Tekshiruv

- Backend: `/health` → `ok: true`
- Backend: `/ready` → `initializationComplete: true`
- Frontend: `/health` → `apiConfigured: true`

Login:

```text
admin
123456
```

Production ishga tushgach parolni kuchliroq qiymatga almashtiring; keyingi backend redeploy admin parolini yangi qiymatga sinxronlaydi.

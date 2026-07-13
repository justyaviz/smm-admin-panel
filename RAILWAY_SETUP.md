# Railway sozlash

## 1. GitHub repository tuzilmasi

ZIP ichidagi fayllarni repository ildiziga yuklang. GitHub ichida aynan quyidagi papkalar bo‘lishi kerak:

```text
/frontend
/backend
```

## 2. Backend service

Railway → `backend` service → Settings:

```text
Root Directory: /backend
Config File Path: /backend/railway.toml
```

Backend Variables → RAW Editor:

```env
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=BU_YERGA_KAMIDA_32_BELGILI_MAXFIY_KALIT
JWT_EXPIRES_IN=12h
CORS_ORIGIN=https://FRONTEND-DOMAIN.up.railway.app
ADMIN_FULL_NAME=Aloo Admin
ADMIN_LOGIN=admin
ADMIN_PHONE=998901234567
ADMIN_PASSWORD=KUCHLI_YANGI_PAROL
```

`Postgres` nomi Railway canvasidagi PostgreSQL service nomi bilan bir xil bo‘lishi kerak. Agar service nomi boshqacha bo‘lsa, reference variable ichida shu nomni yozing.

Backend uchun Railway domain yarating. Keyin custom domain sifatida:

```text
api.aloosmm.uz
```

ulash mumkin.

## 3. Frontend service

Railway → `frontend` service → Settings:

```text
Root Directory: /frontend
Config File Path: /frontend/railway.toml
```

Frontend Variables:

```env
VITE_API_URL=https://BACKEND-DOMAIN.up.railway.app
```

Custom backend domeni ulangandan keyin:

```env
VITE_API_URL=https://api.aloosmm.uz
```

Frontend uchun Railway domain yarating. Keyin:

```text
aloosmm.uz
```

custom domain sifatida ulanadi.

## 4. CORS

Frontend domeni o‘zgarsa, backenddagi `CORS_ORIGIN` qiymatini ham yangilang. Bir nechta domen uchun vergul bilan yozish mumkin:

```env
CORS_ORIGIN=https://frontend-production.up.railway.app,https://aloosmm.uz
```

## 5. Birinchi deploy

1. Avval PostgreSQL service ishlayotganini tekshiring.
2. Backendni deploy qiling va `/health` endpointi `{"ok":true}` qaytarishini tekshiring.
3. Frontendda `VITE_API_URL` ni backend domainiga yozing.
4. Frontendni redeploy qiling.
5. `ADMIN_LOGIN` va `ADMIN_PASSWORD` bilan tizimga kiring.

Backend birinchi ishga tushganda jadvallarni avtomatik yaratadi va database bo‘sh bo‘lsa, environment variable orqali birinchi adminni yaratadi.

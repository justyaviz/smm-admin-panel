# aloo SMM Panel — 2-qadam

Bu versiyada **Kontent boshqaruvi va Kalendar** modullari qo‘shildi.

## Yangi funksiyalar

- PostgreSQL orqali real kontent CRUD
- Post, Reels, Story, Shorts, Video, Karusel, Banner va Live turlari
- Instagram, Telegram, Facebook, YouTube va TikTok platformalari
- Filial, mas’ul xodim, status va nashr vaqti
- Qidiruv va filterlar
- Kontentni tahrirlash, nusxalash va o‘chirish
- Oylik kalendar va kun ichidagi kontentlar
- Kalendar kunidan to‘g‘ridan-to‘g‘ri kontent yaratish
- Dashboard uchun real PostgreSQL statistikasi
- Kontent status tarixi va audit log

## Railway

Frontend:

```text
Root Directory: /frontend
Config File Path: /frontend/railway.toml
```

Frontend Variables:

```env
API_URL=https://BACKEND-DOMEN.up.railway.app
```

Backend:

```text
Root Directory: /backend
Config File Path: /backend/railway.toml
```

Backend Variables:

```env
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=kamida-32-belgili-juda-maxfiy-kalit
CORS_ORIGIN=https://FRONTEND-DOMEN.up.railway.app,https://aloosmm.uz
ADMIN_FULL_NAME=Aloo Admin
ADMIN_LOGIN=admin
ADMIN_PASSWORD=123456
```

Backend ishga tushganda `backend/sql/schema.sql` avtomatik bajariladi. Eski login va audit ma’lumotlari o‘chirilmaydi; yangi jadvallar qo‘shiladi.

## SQL fayllari

- `database/aloo_smm_schema.sql` — to‘liq schema
- `database/demo_seed.sql` — ixtiyoriy demo kontent

## Deploy tartibi

1. ZIP ichidagi fayllarni GitHub repository ildiziga yuklang.
2. Avval backendni **Clear build cache and redeploy** qiling.
3. `/ready` endpoint `ok: true` qaytarganini tekshiring.
4. Frontendni redeploy qiling.
5. Kontent va Kalendar menyularini tekshiring.

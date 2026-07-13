# Step 6 — Filiallar, jamoa, rollar va ruxsatlar

## Filiallar
- Filial yaratish, tahrirlash, arxivlash va qayta faollashtirish
- Hudud, manzil, telefon, rahbar va oylik maqsadlar
- Kontent, reach, kampaniya, jamoa va akkaunt statistikasi
- Instagram, Telegram, Facebook, YouTube va TikTok akkauntlarini ulash
- Filialga biriktirilgan xodimlarni ko‘rish

## Jamoa
- Xodim yaratish, tahrirlash, bloklash va faollashtirish
- Login, parol, telefon, email, Telegram va lavozim
- Bir yoki bir nechta filialga biriktirish
- Asosiy filialni belgilash
- Parolni administrator orqali yangilash

## Rollar va ruxsatlar
- Administrator, SMM Manager, Targetolog, Dizayner, Mobilograf, Copywriter, Analitik va Kuzatuvchi
- 25 ta modul ruxsati
- Ruxsatlarni rol bo‘yicha yoqish/o‘chirish
- Menyu foydalanuvchining ruxsatlariga qarab avtomatik yashiriladi
- Backend API ham ruxsatlarni tekshiradi

## Yangi API endpointlar

```text
GET    /api/branches
POST   /api/branches
GET    /api/branches/:id
PUT    /api/branches/:id
PATCH  /api/branches/:id/status
PUT    /api/branches/:id/accounts/:platformId
DELETE /api/branches/:id

GET    /api/team
POST   /api/team
GET    /api/team/:id
PUT    /api/team/:id
PATCH  /api/team/:id/status
POST   /api/team/:id/reset-password
DELETE /api/team/:id

GET    /api/roles
PUT    /api/roles/:code/permissions
```

## Migratsiya
Backend ishga tushganda `backend/sql/schema.sql` avtomatik bajariladi. Eski ma’lumotlar o‘chmaydi.

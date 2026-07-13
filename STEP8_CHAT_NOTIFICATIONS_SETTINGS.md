# Step 8 — Ichki chat, bildirishnomalar va sozlamalar

## Ichki chat
- Umumiy chat barcha faol xodimlar uchun avtomatik yaratiladi
- Xodim bilan shaxsiy suhbat ochish
- Bir nechta xodimdan guruh yaratish
- Xabar yuborish, javob berish, tahrirlash va o‘chirish
- O‘qilmagan xabarlar soni
- Xabarlar har 6 soniyada avtomatik yangilanadi
- Chat xabari boshqa a’zolarga panel bildirishnomasi yaratadi
- JWT va `chat.use` ruxsati bilan himoyalangan

## Bildirishnomalar
- Yuqori panelda real o‘qilmagan bildirishnomalar soni
- Bildirishnomalar yon paneli
- Bittasini yoki hammasini o‘qilgan deb belgilash
- Bildirishnomani o‘chirish
- Chat, vazifa, xarajat, hisobot va tizim bildirishnomalari
- Bildirishnomadan kerakli modulga o‘tish
- Har bir foydalanuvchining bildirishnoma xohishlari saqlanadi

## Sozlamalar
- Profil ma’lumotlarini yangilash
- Avatar URL, telefon, email, lavozim va Telegram
- Joriy parolni tekshirgan holda yangi parol o‘rnatish
- Chat, vazifa, kontent, xarajat va hisobot bildirishnomalarini boshqarish
- Til, vaqt zonasi va sana formati
- Administrator/SMM Manager uchun tashkilot sozlamalari
- Tizim versiyasi va PostgreSQL statistikasi

## API endpointlar

```text
GET    /api/chat/channels
POST   /api/chat/channels
POST   /api/chat/direct/:userId
GET    /api/chat/members
GET    /api/chat/channels/:id/messages
POST   /api/chat/channels/:id/messages
PATCH  /api/chat/channels/:id/read
PUT    /api/chat/messages/:id
DELETE /api/chat/messages/:id

GET    /api/notifications
GET    /api/notifications/count
PATCH  /api/notifications/:id/read
POST   /api/notifications/read-all
DELETE /api/notifications/:id

GET    /api/settings/profile
PUT    /api/settings/profile
PUT    /api/settings/password
GET    /api/settings/preferences
PUT    /api/settings/preferences
GET    /api/settings/company
PUT    /api/settings/company
GET    /api/settings/system
```

## Migratsiya
Backend ishga tushganda `backend/sql/schema.sql` avtomatik bajariladi. Oldingi modullar va ma’lumotlar o‘chirilmaydi. Step 8 quyidagi jadvallarni qo‘shadi:

```text
chat_channels
chat_channel_members
chat_messages
notifications
user_preferences
app_settings
```

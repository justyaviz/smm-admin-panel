# SMM Panel Upgrade — Phase 1 Patch

Bu patch mavjud kodlarni tozalab tashlamaydi. Faqat production uchun xavfli va fresh database’da xato berishi mumkin bo‘lgan joylar minimal o‘zgartirildi.

## O‘zgargan fayllar

- `server/src/server.js`
- `server/src/auth.js`

## Qilingan ishlar

1. `admin / 12345678` fallback login olib tashlandi.
2. `JWT_SECRET` production’da majburiy qilindi. Development’da vaqtincha fallback ishlaydi, lekin warning beradi.
3. CORS production’da har qanday origin’ni avtomatik ochib yubormaydi.
4. Fresh database’da `ALTER TABLE` xatolari chiqmasligi uchun `expenses`, `travel_expenses`, `travel_plans` jadvallari runtime schema boshida safe `CREATE TABLE IF NOT EXISTS` bilan yaratiladi.
5. `bonus_items.bonus_id` mavjud bo‘lmasa migration yiqilmasligi uchun xavfsiz `DO $$ ... IF EXISTS ... $$` blokiga o‘tkazildi.

## Tekshirildi

- `node --check server/src/server.js` — OK
- `node --check server/src/auth.js` — OK
- `npm run build` frontend — OK

## Deploy qilishdan oldin Railway backend variables

Quyidagilar backend service ichida bo‘lishi kerak:

```env
NODE_ENV=production
JWT_SECRET=uzun_va_maxfiy_random_secret
DATABASE_URL=postgresql://...
CLIENT_URL=https://frontend-domain
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=-100...
TARGET_CAMPAIGN_CHAT_ID=-100...
```

## Keyingi bosqich

2-bosqichda yangi aloo SaaS ko‘rinishini kodga kiritish boshlanadi:

- yangi sidebar/topbar layout
- dashboard cardlar
- kontent kalendar UI
- ssenariy builder UI
- mobilografiya kanban UI


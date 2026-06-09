# Yaviz fixes — 2026-06-09

Men tekshirgan va tuzatgan qismlar:

## 1) Telegram xabar yuborish hotfix
Oldin backend Telegram tokenni faqat `app_settings.telegram_bot_token` ustunidan olardi. Railway variables ichida `TELEGRAM_BOT_TOKEN` bo'lsa ham, database sozlamasida token bo'lmasa xabar yuborilmasdan jim to'xtab qolishi mumkin edi.

Endi backend quyidagi env qiymatlarini ham fallback sifatida o'qiydi:

- `TELEGRAM_BOT_TOKEN`
- `BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `TELEGRAM_GROUP_ID`
- `TELEGRAM_ADMIN_CHAT_ID`
- `TARGET_CAMPAIGN_CHAT_ID`
- `TRAVEL_PLAN_CHAT_ID`

Agar token yoki chat ID topilmasa, test endpoint aniq xato qaytaradi.

## 2) Public settings xavfsizligi
`GET /api/settings` endpoint login sahifada ham ishlatilgani uchun ochiq turardi. U token maydonlarini ham qaytarib yuborishi xavfi bor edi.

Endi:

- login bo'lmagan/public requestlarda `telegram_bot_token` qaytmaydi;
- `telegram_chat_id` ham faqat `configured` ko'rinishida maskalanadi;
- valid login token bilan kirilganda settings sahifasi odatdagidek ishlaydi.

## 3) Dependency audit yengillashtirildi
`npm audit fix` orqali frontend va backend lockfile'larda xavfsizlik yangilanishlari qilindi.

Natija:

- Client production build muvaffaqiyatli o'tdi.
- Server syntax check toza o'tdi.
- Client audit: 0 vulnerability.
- Server audit: faqat `exceljs` ichidagi `uuid` bilan bog'liq moderate ogohlantirish qoldi. Uni `npm audit fix --force` bilan to'g'rilash mumkin, lekin bu `exceljs`ni breaking downgrade qilishi mumkin, shuning uchun hozircha majburan bosmadim.

## 4) Tekshiruv natijalari

```bash
cd client
npm run build
# OK
```

```bash
cd server
node --check src/server.js
# OK
```

```bash
PORT=18080 NODE_ENV=development JWT_SECRET=test_secret_123 node src/server.js
curl http://localhost:18080/api/ping
# {"ok":true,"service":"aloo-smm-server"}
```

Database ulanmaganda server ping endpoint ishlaydi, lekin startup schema database bo'lmagani uchun `ECONNREFUSED 127.0.0.1:5432` beradi. Railway'da `DATABASE_URL` to'g'ri bo'lishi shart.

## Railway uchun kerakli env checklist
Backend service variables ichida kamida shular bo'lsin:

```env
PORT=8080
NODE_ENV=production
JWT_SECRET=uzun_va_maxfiy_secret
DATABASE_URL=postgresql://...
DB_SSL=true
CLIENT_URL=https://frontend-url
ALLOWED_ORIGINS=https://frontend-url
TELEGRAM_BOT_TOKEN=bot_token
TARGET_CAMPAIGN_CHAT_ID=-100...
TELEGRAM_GROUP_ID=-100...
TRAVEL_PLAN_CHAT_ID=-100...
```

Frontend service variables:

```env
VITE_API_BASE=https://backend-url
VITE_SITE_URL=https://frontend-url
```

Agar frontendda `Failed to fetch` chiqsa, birinchi navbatda:

1. `VITE_API_BASE` backend URL ekanini tekshir.
2. Backend `CLIENT_URL` va `ALLOWED_ORIGINS` ichida frontend URL borligini tekshir.
3. Backend `/api/ping` ochilishini tekshir.
4. Backend `/api/db-health` database ulanishini tekshir.

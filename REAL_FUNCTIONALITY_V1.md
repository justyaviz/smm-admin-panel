# aloo SMM Admin Panel — Real Functionality v1

Bu versiyada frontend professional redesign saqlangan holda real API bilan ishlaydigan asosiy amallar qo'shildi.

## Ishlaydigan asosiy amallar

1. Kontent qo'shish
   - Endpoint: POST /api/content
   - Maydonlar: sarlavha, sana, kanal, tur, status, mas'ul, izoh
   - Calendar sahifasida real ko'rinadi
   - Tasdiqlash / rejaga qaytarish ishlaydi

2. Kampaniya yaratish
   - Endpoint: POST /api/campaigns
   - Maydonlar: nom, kanal, filial, start/tugash, budget, spend, lead, sales, status
   - CPL/ROI dashboardda real hisoblanadi

3. Vazifa yaratish va status o'zgartirish
   - Endpoint: POST /api/tasks
   - Endpoint: PUT /api/tasks/:id
   - Kanban ustunlarida status o'zgaradi

4. Xarajat qo'shish
   - Endpoint: POST /api/expenses
   - Moliya sahifasida chart va jadvalga tushadi

5. Media upload
   - Endpoint: POST /api/uploads
   - Fayl, papka va teglar yuboriladi
   - Media kutubxonasida ko'rinadi

## Qo'shilgan / o'zgartirilgan fayllar

- client/src/App.jsx — yangi professional SPA + real API logic
- client/src/App.legacy.jsx — eski App backup
- client/src/pro-ui.css — yangi professional dizayn system

## Build holati

`npm run build` muvaffaqiyatli o'tdi.

## Keyingi tavsiya qilinadigan ishlar

- Database migration tartibini to'g'rilash
- Admin fallback parolni olib tashlash
- CORS va JWT xavfsizligini yopish
- Upload file size/type limit qo'shish
- Approval workflowni alohida table/status history bilan kuchaytirish
- Dashboard statistikalarini server tarafida bitta summary endpointga jamlash

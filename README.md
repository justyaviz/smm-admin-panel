# aloo SMM Platforma - Muse inspired starter

Bu ZIP ichida GitHub uchun tayyor frontend starter bor.

## Tarkib
- `client/` - React + Vite frontend
- `server_stub/` - bo'sh joy, mavjud backend bilan ishlatish uchun

## Muhim
Bu paket premium **frontend karkas** beradi:
- aloo brand ranglari
- muse-uslubiga yaqin layout
- sidebar, topbar, widgetlar
- login ekran
- jadval sahifalari
- dark/light
- qidiruv

Lekin quyidagi funksiyalarni to'liq production holatga keltirish uchun keyingi bosqichda alohida backend/frontend CRUD ulanish kerak bo'ladi:
- KPI formulalari
- bonus item formasi
- daily reports formasi
- upload formasi
- export pdf/xlsx
- role-based UI guardlar
- audit log CRUD sahifasi
- notifications drawer

## Ishga tushirish
`client` ichida:

```bash
npm install
npm run dev
```

## Railway
- Root directory: `client`
- Build command: `npm install && npm run build`
- Start command: `npm run preview`
- Variable: `VITE_API_BASE=https://smm-admin-panel-back-production.up.railway.app`

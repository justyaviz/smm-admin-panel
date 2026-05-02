# alooSMM 3.0

Professional SMM va marketing boshqaruv platformasi — O'zbekiston uchun.

## Monorepo tarkibi

- `client/` — React + Vite admin panel (v3.0)
- `server/` — Express + PostgreSQL API
- `mobile/` — React Native (Expo) mobil ilova

## V3.0 yangiliklari

- Yangi dizayn tizimi: Syne + Inter shriftlar, to'q dark mode, gradient accent
- Professional login sahifasi — animatsiyali chap panel
- Yangi sidebar: guruhlar, badge, version ko'rsatkich
- Yangi tugmalar, formalar, jadvallar — zamonaviy ko'rinish
- alooSMM 3.0 brending, favicon, SEO kalit so'zlar
- PWA manifest yangilandi, theme-color o'zgardi
- Barcha shrift Inter/Syne ga o'tkazildi

## Ishga tushirish

### 1. Backend

```bash
cd server
npm install
npm start
```

`.env` sozlamalari (`server/.env.example` asosida):
- `PORT`
- `JWT_SECRET`
- `DATABASE_URL`
- `CLIENT_URL`

### 2. Frontend

```bash
cd client
npm install
npm run dev
```

### 3. Build

```bash
cd client
npm run build
```

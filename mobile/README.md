# aloo mobile

Bu papka web paneldan alohida Expo mobile ilova uchun. `client/` va `server/` joyida qoladi, iOS app esa shu `mobile/` ichida rivojlanadi.

## Env

`.env` ichiga:

```env
EXPO_PUBLIC_API_BASE=https://your-backend-domain
```

## Local ishga tushirish

```bash
npm install
npm run start
```

## iOS build

```bash
npx eas-cli build --platform ios --profile preview
npx eas-cli build --platform ios --profile production
```

## Birinchi versiya

- Login
- Dashboard summary
- Kontent oynasi
- Bonus oynasi
- Profil va parol almashtirish

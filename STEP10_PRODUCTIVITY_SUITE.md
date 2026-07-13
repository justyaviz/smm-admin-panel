# Step 10 — Productivity Suite

## 1. Tezkor kontent
Yangi kontent oynasida faqat sarlavha, format va platforma majburiy. Filial, mas’ul, status, vaqt, tavsif, teglar va boshqa maydonlar qo‘shimcha sozlamalarda joylashgan. Tugallanmagan forma brauzerda autosave qilinadi.

## 2. Kontent shablonlari
PostgreSQL ichida saqlanadigan shablonlar mavjud. Administrator va SMM Manager shablonlarni boshqarishi mumkin. Standart shablonlar migratsiya vaqtida avtomatik qo‘shiladi.

## 3. Drag-and-drop kalendar
Kontent kartasini yangi kunga sudrash `/api/content/:id/schedule` orqali nashr sanasini yangilaydi. Kalendar kunidan yangi kontent ochilganda sana avtomatik tanlanadi.

## 4. Ctrl/Cmd + K
Global command palette orqali sahifaga o‘tish, kontent, vazifa yoki xarajat qo‘shish va asosiy obyektlarni qidirish mumkin.

## 5. Rolga mos Dashboard
Admin, SMM Manager, Targetolog, Dizayner, Mobilograf, Copywriter, Analitik va Kuzatuvchi rollari uchun turli tezkor amallar va urg‘ular ko‘rsatiladi.

## 6. Tasdiqlash workflow
Statuslar:

```text
Draft → Tekshiruvda → Tuzatish kerak → Tasdiqlandi → Rejalashtirildi → Chop etildi
```

Kontent ichida izoh, tuzatish so‘rovi va tasdiqlash tarixi mavjud.

## 7. Aqlli bildirishnomalar
`/api/notifications/smart-check` yaqinlashayotgan kontentlar va kechikkan vazifalarni tekshiradi. Frontend davriy tekshiruv orqali foydalanuvchini ogohlantiradi.

## 8. Media vositalari
- Drag-and-drop upload
- 1:1, 4:5, 9:16 va 16:9 crop
- SHA-256 duplicate aniqlash
- Yaqinda ishlatilgan media
- Media kutubxonasidan kontent coveriga bir bosishda biriktirish

## 9. AI yordamchi
Standart holatda server ichidagi lokal generator ishlaydi. `OPENAI_API_KEY` berilsa tashqi AI provider ishlatiladi. Natija avtomatik chop etilmaydi; foydalanuvchi ko‘rib, nusxalaydi yoki forma ichiga qo‘shadi.

Ixtiyoriy backend variables:

```env
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5-mini
```

## 10. Real-time
Server-Sent Events endpointi:

```text
GET /api/realtime/events
```

Kontent, chat, vazifa va xarajat o‘zgarishlari ochiq panelga darhol uzatiladi. Chatda online/offline holati ko‘rinadi. Bir kontentni boshqa xodim tahrirlayotgan bo‘lsa tahrirlash oynasida ogohlantirish chiqadi.

## 11. PWA va Web Push
- `site.webmanifest`
- service worker
- offline sahifa
- install prompt
- mobil bottom navigation
- manifest shortcuts
- browser yopiq bo‘lganda ham Web Push

Web Push ixtiyoriy. VAPID kalitlarini yaratish:

```bash
cd backend
npm install
npm run generate:vapid
```

Railway backend Variables:

```env
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:admin@aloosmm.uz
```

VAPID belgilanmasa real-time panel bildirishnomalari ishlaydi, faqat yopiq brauzerga push yuborilmaydi.

## 12. Premium UX
Dark mode, skeleton loading, micro-animatsiyalar, reduced-motion qo‘llovi, toast xabarlari, autosave va yumshoq o‘chirishdan keyingi Undo qo‘shilgan.

## Database migratsiyasi
Backend ishga tushganda `backend/sql/schema.sql` avtomatik bajariladi. Step 10 migratsiyasi idempotent: jadvallar, ustunlar, indekslar va standart shablonlar qayta deployda xavfsiz yangilanadi.

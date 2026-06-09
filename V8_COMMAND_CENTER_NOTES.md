# V8 Command Center update — 2026-06-09

Bu versiyada mavjud funksiyalar buzilmasdan, panel yangi bosqichga olib chiqildi.

## Qo'shilgan asosiy imkoniyatlar

### 1. Dashboard: V8 Command Center
- Bugungi kontent, deadline risk, faol target va platforma monitoringi bir joyga chiqarildi.
- AI xulosa kartasi qo'shildi: target qizil zonadami, deadline bormi, yoki operatsiya stabilmi — avtomatik ko'rsatadi.
- Live feed qo'shildi: bugungi kontent, task va target signallari tezkor ko'rinadi.

### 2. Kontent reja: V8 Rhythm Analyzer
- Oylik kontent ritm score qo'shildi.
- Kalendar heatmap: qaysi kunlarda kontent ko'p, qaysi kunlar bo'sh, qaysi kunlarda video bor, qaysi kunlarda deadline risk bor ko'rinadi.
- Bo'sh sanalar bo'yicha avtomatik tavsiya beradi.

### 3. Reklama kampaniyalari: V8 Target Analytics
- Kampaniyalar yashil / sariq / qizil zonaga avtomatik ajratiladi.
- CPL, lid, ko'rishlar va sarf bo'yicha performance score chiqariladi.
- Qaysi targetni davom ettirish, qaysisini qayta ishlash kerakligi yozib beriladi.
- Filiallar bo'yicha target natijasi alohida ko'rinadi.

## Texnik eslatma
- O'zgarishlar asosan `client/src/App.jsx` ichiga qo'shildi.
- Backend database strukturasiga majburiy migration kiritilmadi.
- Mavjud API va eski funksiyalar saqlandi.
- `npm run build` muvaffaqiyatli o'tdi.
- Build paytida Vite katta chunk warning berdi, bu xato emas.

## Keyingi tavsiya qilinadigan bosqich
V9 uchun: drag-and-drop task board, real notification rules, Telegram daily report automation, va AI caption generator endpointini qo'shish.

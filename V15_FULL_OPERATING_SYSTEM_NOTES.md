# V15 Full Operating System Upgrade

Sana: 2026-06-09

Bu paket V8 ustiga V9-V15 bosqichlarini qo'shadi. Maqsad: panelni chiroyli dashboarddan real SMM operating system darajasiga olib chiqish.

## Qo'shilgan modullar

### V9 — Content Calendar Pro
- Oylik kalendar board.
- Status/stage hisoboti: g'oya, ishda, joylandi.
- Bo'sh kunlar signali.
- Kontentni +7 kunga duplicate qilish.
- Bir bosishda haftalik kontent reja generatori.

### V10 — Task Management Pro
- Kanban workflow: Yangi, Jarayonda, Tasdiqda, Tugadi, Bekor.
- Deadline, urgent, kechikkan task statistikasi.
- Quick task yaratish tugmalari.
- Statusni tez almashtirish.

### V11 — Telegram Bot Pro
- Telegram test xabari.
- Kunlik workflow digest yuborish.
- Target, kontent, deadline va digest workflow kartalari.

### V12 — Target Analytics 2.0
- Filial reytingi.
- Yashil/sariq/qizil target bahosi.
- AI media-buyer xulosasi.
- Next action list.

### V13 — File & Media Library
- Media vault statistikasi.
- Papkalar bo'yicha tez filter.
- Rasm/video filter tugmalari.

### V14 — Role & Permission
- Role matrix.
- Har bir rolda nechta user borligi.
- Presetni hodim formasiga qo'yish tugmasi.

### V15 — Mobile/PWA App
- Mobile/PWA status paneli.
- Telefon app preview.
- PWA checklist: bottom nav, manifest, iPhone guide, offline shell.
- Service worker cache nomi v15 ga yangilandi.

## Tekshiruv
- Frontend build: `npm run build` muvaffaqiyatli o'tdi.
- Backend syntax: `node --check server/src/server.js` o'tdi.

## Eslatma
- Buildda faqat Vite katta chunk warning beradi. Bu xato emas, app ishlashiga to'sqinlik qilmaydi.
- V11 Telegram tugmalari real ishlashi uchun `TELEGRAM_BOT_TOKEN` va `TELEGRAM_CHAT_ID` sozlangan bo'lishi kerak.

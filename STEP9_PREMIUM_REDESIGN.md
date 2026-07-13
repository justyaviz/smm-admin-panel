# Step 9 — Premium UX redesign

Ushbu versiyada ma'lumotlar bazasi o'zgarmaydi. Frontend UX va navigatsiya yangilandi.

## Asosiy yangiliklar

- Har bir modul uchun alohida URL: `/dashboard`, `/content`, `/kalendar`, `/kampaniyalar`, `/target-reklama`, `/analitika`, `/hisobotlar`, `/media`, `/filiallar`, `/vazifalar`, `/jamoa`, `/xarajatlar`, `/chat`, `/sozlamalar`.
- Browser back/forward tugmalari ishlaydi.
- Favicon, Apple touch icon va web manifest qo'shildi.
- Sahifa almashish, kartalar, tugmalar, modal va chat uchun yumshoq animatsiyalar qo'shildi.
- Barcha modullarda matn o'lchamlari kattalashtirildi va o'qilishi yaxshilandi.
- Sidebar guruhlarga ajratildi: Asosiy, Marketing, Boshqaruv.
- Kontent sahifasi premium hero, yangi statistik kartalar va kengroq jadval bilan qayta ishlangan.
- Kontent qo'shish oynasi tezkor formatga o'tkazildi: faqat sarlavha, kontent turi va platforma majburiy. Qolgan maydonlar “Qo'shimcha sozlamalar” ichida.
- Kontent formasi uchun jonli social preview va tezkor sana tugmalari qo'shildi.

## Gilroy

CSS butun sayt bo'ylab `Gilroy` oilasini majburiy ishlatadi. Font fayllari litsenziya sabab ZIP ichiga kiritilmagan. O'zingizning litsenziyalangan fayllaringizni quyidagi papkaga joylashtiring:

`frontend/public/fonts/`

Fayl nomlari:

- `Gilroy-Regular.ttf`
- `Gilroy-Medium.ttf`
- `Gilroy-Semibold.ttf`
- `Gilroy-Bold.ttf`

## Railway

Root Directory va Config File Path o'zgarmaydi:

- Frontend: `/frontend`, `/frontend/railway.toml`
- Backend: `/backend`, `/backend/railway.toml`

Avval backend, so'ng frontend uchun **Clear build cache and redeploy** bajaring.

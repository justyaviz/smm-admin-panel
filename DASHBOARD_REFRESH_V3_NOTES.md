# Dashboard Refresh v3 — Boshqaruv markazi

Bu versiyada eski tizim saqlandi. Faqat `Boshqaruv markazi` (`DashboardPage`) ko‘rinishi professional SaaS uslubida yangilandi.

## Saqlangan narsalar
- Eski backend/API ulanishlari
- Eski sahifalar va route'lar
- Eski kontent, bonus, task, campaign, expense, upload funksiyalari
- Eski export tugmalari
- Database strukturasi o‘zgartirilmadi

## Yangilangan narsalar
- `Bosh sahifa` menyu nomi `Boshqaruv markazi` bo‘ldi
- Dashboard hero bloki professional command center uslubiga o‘tdi
- Real data bilan ishlaydigan yangi KPI cardlar qo‘shildi
- Kontent/reklama/bonus ritmi uchun yangi chart layout qo‘shildi
- Filial KPI, yaqin vazifalar, alertlar, so‘nggi kontentlar va hisobotlar chiroyli card/table ko‘rinishga o‘tdi
- CSS faqat dashboard uchun `command-*` classlar bilan qo‘shildi, boshqa sahifalar buzilmasligi uchun alohida yozildi

## Tekshiruv
`client` ichida `npm run build` muvaffaqiyatli o‘tdi.

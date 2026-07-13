# Step 3 — Kampaniyalar + Target reklama

## Qo‘shilgan modullar

### Kampaniyalar
- kampaniya yaratish, tahrirlash va o‘chirish;
- maqsad, mahsulot yo‘nalishi, filiallar va platformalar;
- byudjet, sarf, reach, klik, video ko‘rish, engagement va sotuvlar;
- ROI avtomatik hisoblanadi;
- statuslar: Draft, Rejada, Faol, To‘xtatilgan, Yakunlangan, Bekor qilingan;
- qidiruv va filterlar;
- top kampaniyalar va holat taqsimoti.

### Target reklama
- reklama yaratish, tahrirlash va o‘chirish;
- kampaniya, platforma, filial va auditoriya;
- kunlik/umumiy byudjet, sarf, impressions, reach, klik, xabar va sotuvlar;
- CPM va CTR avtomatik hisoblanadi;
- platformalar bo‘yicha natija va eng yaxshi reklamalar;
- qidiruv va filterlar.

### Dashboard
- faol kampaniyalar;
- faol reklamalar;
- kampaniya sarfi;
- reklama kliklari.

## API
- GET/POST `/api/campaigns`
- GET/PUT/DELETE `/api/campaigns/:id`
- GET `/api/campaigns/summary`
- GET/POST `/api/ads`
- PUT/DELETE `/api/ads/:id`
- GET `/api/ads/summary`

## Deploy
Eski ma’lumotlar o‘chmaydi. Backend ishga tushganda yangi jadvallar avtomatik yaratiladi.
1. Backend: Clear build cache and redeploy
2. `/ready` endpointi `ok: true` bo‘lishini tekshiring
3. Frontend: Clear build cache and redeploy

`database/demo_seed.sql` ixtiyoriy demo ma’lumotlar uchun.

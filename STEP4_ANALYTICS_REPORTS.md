# Step 4 — Analitika + Hisobotlar

## Analitika

- Sana oralig‘i, platforma va filial bo‘yicha filter
- Reach, impressions, klik, CTR, CPM, CPC, CPL
- Engagement va engagement rate
- Xabarlar, leadlar, sotuvlar, sotuv qiymati
- Reklama sarfi va ROAS
- Kunlik reach trend grafigi
- Platformalar kesimida tahlil
- Filiallar reytingi
- Top kampaniyalar
- Kundalik natijalarni yaratish, tahrirlash va o‘chirish

API:

```text
GET    /api/analytics/overview
GET    /api/analytics/entries
POST   /api/analytics/entries
PUT    /api/analytics/entries/:id
DELETE /api/analytics/entries/:id
```

## Hisobotlar

- To‘liq SMM hisoboti
- Umumiy KPI hisoboti
- Platformalar tahlili
- Filiallar tahlili
- Kampaniyalar tahlili
- Kontent hisoboti
- Excel `.xlsx`, PDF va CSV formatlari
- Hisobotlar tarixi va qayta yuklash

API:

```text
GET    /api/reports
GET    /api/reports/summary
POST   /api/reports
GET    /api/reports/:id/download
DELETE /api/reports/:id
```

## PostgreSQL jadvallari

```text
analytics_daily_metrics
report_exports
```

Backend ishga tushganda jadvallar avtomatik yaratiladi. Qo‘lda migratsiya uchun `database/aloo_smm_schema.sql` faylidan foydalaning.

## Demo ma’lumotlar

Test muhitida `database/demo_seed.sql` faylini bir marta bajaring. Bu 14 kunlik analitika natijalari va namunaviy hisobot tarixini yaratadi.

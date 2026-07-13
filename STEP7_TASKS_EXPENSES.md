# Step 7 — Vazifalar va xarajatlar

## Vazifalar
- Kanban va jadval ko‘rinishi
- Backlog, bajarish kerak, jarayonda, tekshiruvda, bajarildi va bekor qilindi statuslari
- Past, o‘rta, yuqori va shoshilinch ustuvorlik
- Xodim va filialga biriktirish
- Boshlanish va deadline vaqti
- Taxminiy va sarflangan vaqt
- Drag & drop orqali statusni almashtirish
- Vazifa izohlari va status tarixi
- Qidiruv, filial, xodim va ustuvorlik filterlari
- “Mening vazifalarim” filtri

## Xarajatlar
- Xarajat yaratish, tahrirlash va o‘chirish
- Draft, tasdiq kutmoqda, tasdiqlandi, to‘landi, rad etildi va bekor qilindi statuslari
- Kategoriya, filial va kampaniyaga biriktirish
- Naqd, karta, bank o‘tkazmasi va korporativ karta
- Tasdiqlash, rad etish va to‘landi deb belgilash
- Oylik umumiy, filial yoki kategoriya byudjeti
- Oylik sarf, qolgan limit va kategoriya taqsimoti
- Xarajat status tarixi va audit log

## API endpointlar

```text
GET    /api/tasks
GET    /api/tasks/summary
GET    /api/tasks/:id
POST   /api/tasks
PUT    /api/tasks/:id
PATCH  /api/tasks/:id/status
POST   /api/tasks/:id/comments
DELETE /api/tasks/:id

GET    /api/expenses
GET    /api/expenses/summary
GET    /api/expenses/categories
GET    /api/expenses/budgets
GET    /api/expenses/:id
POST   /api/expenses
PUT    /api/expenses/:id
PATCH  /api/expenses/:id/status
POST   /api/expenses/budgets
DELETE /api/expenses/:id
```

## Migratsiya
Backend ishga tushganda `backend/sql/schema.sql` avtomatik bajariladi. Oldingi modullar va ma’lumotlar saqlanadi.

# Telegram Target Hotfix v6.3

Tuzatildi:
- Target ishga tushdi xabari endi hardcoded chat ID'ga ketmaydi.
- `TARGET_CAMPAIGN_CHAT_ID` bo'lmasa, asosiy `TELEGRAM_CHAT_ID` ishlatiladi.
- Telegram sozlamalari DB `app_settings` ichida bo'lmasa ham Railway backend variables orqali ishlaydi.

Backend variables:
- TELEGRAM_BOT_TOKEN=...
- TELEGRAM_CHAT_ID=-100...

Qo'shimcha qo'llab-quvvatlanadi:
- BOT_TOKEN
- TELEGRAM_ADMIN_CHAT_ID
- ADMIN_CHAT_ID
- TELEGRAM_GROUP_ID
- TARGET_CAMPAIGN_CHAT_ID

Muhim: variables backend service ichida bo'lishi va backend redeploy qilinishi kerak.

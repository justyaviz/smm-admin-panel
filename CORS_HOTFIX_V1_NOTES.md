# CORS Hotfix V1

Bu patch frontend domeni `https://www.aloosmm.uz` dan Railway backendga so‘rov yuborishni ruxsat beradi.

Railway backend Variables uchun tavsiya:

```env
CLIENT_URL=https://www.aloosmm.uz
ALLOWED_ORIGINS=https://www.aloosmm.uz,https://aloosmm.uz,http://localhost:5173
```

Eski ma’lumotlar yo‘qolmagan bo‘lishi kerak: screenshotdagi muammo database emas, browser CORS sabab API javoblarini bloklagan.

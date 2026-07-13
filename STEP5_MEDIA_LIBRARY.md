# Step 5 — Media kutubxona

Ushbu versiyada media fayllar Railway ephemeral diskiga emas, PostgreSQL `BYTEA` ustuniga saqlanadi. Shu sababli redeploydan keyin fayllar yo‘qolmaydi.

## Tayyor imkoniyatlar
- JPG, PNG, WebP, GIF, SVG rasmlar
- MP4, WebM, MOV videolar
- MP3, WAV, OGG audio
- PDF, DOC/DOCX, XLS/XLSX, CSV va TXT hujjatlar
- Bir martada 6 tagacha fayl
- Har bir fayl uchun maksimal 8 MB
- Bir yuklashdagi umumiy hajm maksimal 30 MB
- Papka yaratish va papka bo‘yicha filter
- Filial, media turi, status va teglar
- Grid va list ko‘rinishi
- Rasm preview
- Saralanganlar
- Arxivlash va qayta tiklash
- Faylni yuklab olish
- Metadata tahrirlash
- Audit log va JWT himoyasi

## API
- `GET /api/media`
- `GET /api/media/summary`
- `GET /api/media/folders`
- `POST /api/media/folders`
- `POST /api/media/upload`
- `GET /api/media/:id`
- `GET /api/media/:id/file`
- `PUT /api/media/:id`
- `PATCH /api/media/:id/favorite`
- `DELETE /api/media/:id`

## Database
- `media_folders`
- `media_assets`
- `media_asset_links`

Backend ishga tushganda schema avtomatik migratsiya qilinadi. Eski login, kontent, kampaniya, target, analitika va hisobotlar saqlanib qoladi.

-- aloo SMM Panel Step 5 demo media
BEGIN;

WITH demo(display_name,original_name,file_name,mime_type,media_type,extension,b64,folder_name,tags) AS (
  VALUES
    ('CHILLA YARMARKASI', 'demo-chilla.svg', 'demo-chilla.svg', 'image/svg+xml', 'image', 'svg', 'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDgwIiBoZWlnaHQ9IjEwODAiPjxyZWN0IHdpZHRoPSIxMDgwIiBoZWlnaHQ9IjEwODAiIHJ4PSI4MCIgZmlsbD0iIzE2OTBGNSIvPjxjaXJjbGUgY3g9Ijg1MCIgY3k9IjIxMCIgcj0iMTgwIiBmaWxsPSJ3aGl0ZSIgb3BhY2l0eT0iLjEyIi8+PHRleHQgeD0iOTAiIHk9IjE2MCIgZmlsbD0id2hpdGUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSI2NCIgZm9udC13ZWlnaHQ9IjcwMCI+YWxvbzwvdGV4dD48dGV4dCB4PSI5MCIgeT0iNTUwIiBmaWxsPSJ3aGl0ZSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjgyIiBmb250LXdlaWdodD0iNzAwIj5DSElMTEEgWUFSTUFSS0FTSTwvdGV4dD48dGV4dCB4PSI5MCIgeT0iNjUwIiBmaWxsPSJ3aGl0ZSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjMyIj5TTU0gUGFuZWwgZGVtbyBtZWRpYTwvdGV4dD48L3N2Zz4=', 'Aksiyalar', ARRAY['aksiya','chilla']::TEXT[]),
    ('SMARTFONLAR', 'demo-smartfon.svg', 'demo-smartfon.svg', 'image/svg+xml', 'image', 'svg', 'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDgwIiBoZWlnaHQ9IjEwODAiPjxyZWN0IHdpZHRoPSIxMDgwIiBoZWlnaHQ9IjEwODAiIHJ4PSI4MCIgZmlsbD0iIzEyQjc2QSIvPjxjaXJjbGUgY3g9Ijg1MCIgY3k9IjIxMCIgcj0iMTgwIiBmaWxsPSJ3aGl0ZSIgb3BhY2l0eT0iLjEyIi8+PHRleHQgeD0iOTAiIHk9IjE2MCIgZmlsbD0id2hpdGUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSI2NCIgZm9udC13ZWlnaHQ9IjcwMCI+YWxvbzwvdGV4dD48dGV4dCB4PSI5MCIgeT0iNTUwIiBmaWxsPSJ3aGl0ZSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjgyIiBmb250LXdlaWdodD0iNzAwIj5TTUFSVEZPTkxBUjwvdGV4dD48dGV4dCB4PSI5MCIgeT0iNjUwIiBmaWxsPSJ3aGl0ZSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjMyIj5TTU0gUGFuZWwgZGVtbyBtZWRpYTwvdGV4dD48L3N2Zz4=', 'Mahsulotlar', ARRAY['smartfon','mahsulot']::TEXT[]),
    ('REELS COVER', 'demo-reels.svg', 'demo-reels.svg', 'image/svg+xml', 'image', 'svg', 'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDgwIiBoZWlnaHQ9IjEwODAiPjxyZWN0IHdpZHRoPSIxMDgwIiBoZWlnaHQ9IjEwODAiIHJ4PSI4MCIgZmlsbD0iI0U0NDA1RiIvPjxjaXJjbGUgY3g9Ijg1MCIgY3k9IjIxMCIgcj0iMTgwIiBmaWxsPSJ3aGl0ZSIgb3BhY2l0eT0iLjEyIi8+PHRleHQgeD0iOTAiIHk9IjE2MCIgZmlsbD0id2hpdGUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSI2NCIgZm9udC13ZWlnaHQ9IjcwMCI+YWxvbzwvdGV4dD48dGV4dCB4PSI5MCIgeT0iNTUwIiBmaWxsPSJ3aGl0ZSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjgyIiBmb250LXdlaWdodD0iNzAwIj5SRUVMUyBDT1ZFUjwvdGV4dD48dGV4dCB4PSI5MCIgeT0iNjUwIiBmaWxsPSJ3aGl0ZSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjMyIj5TTU0gUGFuZWwgZGVtbyBtZWRpYTwvdGV4dD48L3N2Zz4=', 'Reels cover', ARRAY['reels','cover']::TEXT[])
), uploader AS (
  SELECT id FROM app_users ORDER BY id LIMIT 1
)
INSERT INTO media_assets (
  display_name,original_name,file_name,mime_type,media_type,extension,size_bytes,file_data,folder_id,description,alt_text,tags,uploaded_by
)
SELECT
  d.display_name,d.original_name,d.file_name,d.mime_type,d.media_type,d.extension,
  octet_length(decode(d.b64,'base64')),decode(d.b64,'base64'),f.id,
  'Step 5 demo media','aloo SMM Panel demo media',d.tags,u.id
FROM demo d
JOIN uploader u ON TRUE
LEFT JOIN media_folders f ON LOWER(f.name)=LOWER(d.folder_name)
ON CONFLICT (file_name) DO NOTHING;

COMMIT;

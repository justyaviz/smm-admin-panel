# Railway npm ci / EUSAGE fix

The previous deployment failed because `package.json` and `package-lock.json` were out of sync.
This package intentionally contains no `package-lock.json` files.

Railway settings:
- Frontend Root Directory: `/frontend`
- Backend Root Directory: `/backend`

Do not upload the old `frontend/package-lock.json` or `backend/package-lock.json` files.
Delete them from GitHub before redeploying if they are already present.

Frontend variables:
- `VITE_API_URL=https://YOUR-BACKEND-DOMAIN`

Backend variables:
- `DATABASE_URL=${{Postgres.DATABASE_URL}}`
- `JWT_SECRET=use-a-long-random-secret`
- `CORS_ORIGIN=https://YOUR-FRONTEND-DOMAIN`
- `NODE_ENV=production`

After committing these files, use Railway → Deployments → Redeploy.

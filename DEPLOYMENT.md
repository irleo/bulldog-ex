# Vercel deployment

Create two Vercel projects from this Git repository. Commit and push the intended
deployment branch first; select that branch as each project's Production Branch.

| Setting | Frontend | Backend |
| --- | --- | --- |
| Root directory | `garzon-client` | `garzon-server` |
| Framework preset | Vite | Express |
| Build command | `npm run build` | Default |
| Output directory | `dist` | Default |
| Node.js version | 24.x | 24.x |

The backend exports `app.js`, connects to MongoDB before API middleware executes,
shares a bounded connection pool across warm requests, and initializes required
indexes. `index.js` remains the local development/start entry point.

## Environment variables

Set values under each Vercel project's **Settings → Environment Variables**.
Configure Production and Preview separately. No secrets belong in the client.

Frontend:

```dotenv
VITE_API_URL=https://YOUR-BACKEND.vercel.app/api/v1
```

The production build rejects missing, local, or non-HTTPS API URLs. This value is
embedded at build time, so rebuild/redeploy after changing it.

Backend:

```dotenv
NODE_ENV=production
MONGO_URI=YOUR-MONGODB-ATLAS-CONNECTION-STRING
CLIENT_ORIGIN=https://YOUR-FRONTEND.vercel.app
JWT_SECRET=YOUR-STRONG-RANDOM-SECRET-AT-LEAST-32-CHARACTERS
JWT_EXPIRES_IN=8h
CLOUDINARY_CLOUD_NAME=YOUR-CLOUD-NAME
CLOUDINARY_API_KEY=YOUR-API-KEY
CLOUDINARY_API_SECRET=YOUR-API-SECRET
```

Use an Atlas replica set and database credentials with access to the application's
database. Atlas network access must allow the deployed backend. Checkout and order
transitions require replica-set transactions. Do not run seed scripts against an
existing production database; provision initial accounts/data intentionally.

`CLIENT_ORIGIN` accepts comma-separated exact HTTPS origins without trailing
slashes. For previews, explicitly add the intended frontend preview origin or use
a stable staging domain. Arbitrary preview-domain wildcards are not allowed.
The backend must be accessible to browser requests; Vercel deployment protection
on a preview API may prevent the frontend from reaching it.

Vercel supplies `VERCEL=1` automatically. The application then validates its
managed `x-vercel-forwarded-for` client address for per-client quotas and audit
logs. Leave `TRUST_PROXY` unset on Vercel. On other hosts, configure only known
proxy addresses/subnets.

## First deployment sequence

1. Import the repository for the backend using `garzon-server` as the root.
2. Import it again for the frontend using `garzon-client` as the root.
3. Copy the assigned project domains into the environment variables above.
   You can assign the frontend domain before its first successful build.
4. Deploy/redeploy the backend, then the frontend with the finalized values.
5. Check `/api/v1/health`, catalog reads, login/session restoration, checkout,
   order transitions, image upload, and direct URL refresh on frontend routes.
6. Check Vercel logs and confirm audit records are stored in `auditLogs`.

## Images and cleanup

Product uploads use Cloudinary and have a 4 MiB file limit, leaving room for
multipart fields below Vercel's 4.5 MB request limit. Frontend static images use
compressed WebP assets. Original image files are preserved in the repository.

Legacy product URLs beginning with `/uploads/` require an explicit data/media
migration to Cloudinary before deployment. Local uploads are ignored by Git and
Vercel's Express adapter does not serve `express.static()` assets. New uploads
already persist Cloudinary URLs. Do not modify production records automatically.

Failed Cloudinary deletions are recorded as durable cleanup jobs. An administrator
can retry them through `POST /api/v1/products/media-cleanup/retry`.

Reference: [Express](https://vercel.com/docs/frameworks/backend/express),
[Vite SPA routing](https://vercel.com/docs/frameworks/frontend/vite), and
[function limits](https://vercel.com/docs/functions/limitations).

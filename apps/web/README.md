# apps/web

Next.js (App Router) frontend. Source lives in `src/`; see each directory's README.

Depends on `packages/shared` only. It never imports `packages/db` — data arrives
over HTTP from `apps/api` and is typed from `packages/shared`.

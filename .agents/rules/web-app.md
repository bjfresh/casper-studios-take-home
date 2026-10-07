---
paths: ["apps/web/src/app/**"]
---
# Next.js routes

- App Router files only: pages, layouts, loading/error boundaries.
- Keep route files thin: compose `components/`, call `services/`.
- Audience route groups: `(authenticated)/`, `(public)/`; public dynamic routes
  at `[noun]/`.
- Dynamic segments are plain nouns (`[business]`), never `[businessSlug]` or
  `[business-slug]`.
- Route strings come from `constants/`, never inline.

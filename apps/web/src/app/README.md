# app/

App Router only: routes, layouts, `loading.tsx` / `error.tsx` boundaries.

- Route files stay thin — they compose components from `components/` and call `services/`.
- Group routes by audience:
  - `(authenticated)/` — signed-in surfaces
  - `(public)/` — publicly reachable pages
  - `[param]/` — public dynamic routes
- Name dynamic segments as plain nouns: `[business]`, not `[businessSlug]` or
  `[business-slug]` (kebab-case can't be destructured; the suffix is redundant).
- Route strings are never inlined — use `constants/routes`.

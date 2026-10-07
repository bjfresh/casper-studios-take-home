---
paths:
  - "apps/web/src/constants/**"
  - "apps/web/src/hooks/**"
  - "apps/web/src/services/**"
  - "apps/web/src/data/**"
  - "apps/web/src/providers/**"
  - "apps/web/src/types/**"
  - "apps/web/src/utils/**"
  - "apps/web/src/env/**"
---
# Web non-UI code

- `constants/`: every route string, query key, copy string, token, test id.
  Nothing inlined twice.
- `hooks/`: `use-*.ts`.
- `services/`: framework-free, no JSX. RPC goes through `createApi` (used only by
  `ApiProvider`; components call `useApi()`). Plain REST through
  `apiRequest(path, dataSchema)`. `toApiError()` normalizes failures.
- `data/`: storage via `createStorageItem({ key, schema, fallback })`; no raw
  localStorage/cookie access elsewhere.
- `providers/`: composed into `AppProviders`, mounted once by the root layout:
  Auth → Query → Api → Modal.
- `env/`: read env through `public.ts` / `server.ts`, never `process.env` directly.
- `utils/`: small and pure.
- Never import `packages/db`.

# data/

Storage adapters behind a typed API. Callers never touch `window.localStorage`
or `document.cookie` directly.

`createStorageItem({ key, schema, fallback })` validates every read and falls
back on missing or invalid data, logging why. Keys come from
`constants/storage-keys.ts`.

- `pending-settings.ts`: player settings collected before sign-up.
- `local-storage.ts`: localStorage read and written through React Query, one
  Zod schema per key. Use it for new keys: every observer re-renders on a
  write, in this tab and others. `guestProgress` and `progressOutbox` use it.
- `progress-outbox.ts`: a signed-in player's plays, queued until the API has
  them (see `hooks/use-progress-sync.ts`).

# env/

Environment validated at startup, split by audience so a client bundle can't read
a secret:

- `public.ts` — `NEXT_PUBLIC_*` only; safe in the browser.
- `server.ts` — server-only values; imports `server-only` so a client import fails the build.

Read env through these modules, never `process.env` directly.

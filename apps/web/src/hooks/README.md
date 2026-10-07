# hooks/

Reusable React hooks, one per file, named `use-*.ts`. Tests in `__tests__/`.

- `use-field`: ids and ARIA wiring for a labelled control (see `ui/Field`).
- `use-disclosure`: local open/close state for a modal.
- `use-before-unload`: warns on tab close while a form is dirty.
- `use-auth`: the ONLY auth surface; wraps Privy. Never import Privy elsewhere.
- `use-api`: the typed oRPC client + React Query helpers, with fresh bearer tokens.

# providers/

React context providers, composed in `AppProviders` (Auth → Query → Api →
Modal), which the root layout mounts once.

- `AuthProvider`: Privy configuration. Renders children alone when no app id is set.
- `QueryProvider`: the TanStack Query client.
- `ApiProvider`: the single oRPC client; clears the cache when the user changes.

- `ModalProvider`: registry for modals opened from far away. Read the three
  steps at the top of the file before adding a key.

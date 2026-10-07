# routes/

HTTP layer only: method, path, auth middleware, input parsing (via `contracts/`),
response shaping (via `utils/`). **No business logic.**

One module per resource, paired 1:1 with a service:
`items.ts` ↔ `services/item-service.ts`.

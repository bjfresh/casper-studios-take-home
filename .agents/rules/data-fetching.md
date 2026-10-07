---
paths: ["apps/web/src/**", "apps/api/src/rpc/**", "packages/shared/src/rpc/**"]
---
# Data fetching (oRPC + TanStack Query)

- Every API operation the web app calls is an oRPC procedure, defined once in
  the contract (`packages/shared/src/rpc/contract.ts`) with Zod input/output.
  The API implements it (`apps/api/src/rpc/router.ts`); the web client is typed
  and response-validated from it. Never restate a response type on the client.
- Add a procedure in three places: contract → `router.ts` (thin; call a
  service) → consume it with `useApi()`.
- In components: `useQuery(api.query.<path>.queryOptions({ input }))` and
  `useMutation(api.query.<path>.mutationOptions())`. Query keys come from the
  procedure path; don't hand-write them. Invalidate with
  `queryClient.invalidateQueries({ queryKey: api.query.<path>.key() })`.
- Errors: `toApiError(error)` gives the app's `ApiError` (`code`, `reason`,
  `issues`). Branch on `code`/`reason`, never on message text. For forms, map
  `issues` onto fields with `setError`.
- Procedures throw `AppError`; `rpc/errors.ts` maps it to the oRPC wire format.
  Don't throw raw `ORPCError` from a procedure.
- All `/rpc` procedures are authenticated by structure. A public procedure
  needs its own deliberately unauthenticated handler; discuss it before adding one.
- The query cache is cleared when the signed-in user changes (`ApiProvider`).

# services/

Framework-free logic and the typed API client. **No JSX, no React.**

`apiRequest(path, dataSchema)` validates the response envelope and its data,
since our own API is still a boundary, and never throws: failures come back as
`{ ok: false, error }`. Response types come from `@repo/shared`.

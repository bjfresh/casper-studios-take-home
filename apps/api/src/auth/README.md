# auth/

Authentication: who is calling. Privy owns identity; this directory turns a
bearer token into a verified identity and nothing more.

- `auth-client.ts`: the `AuthClient` seam (verify a token, look up a profile)
  and the profile memo. Tests inject a fake through `createApp({ authClient })`.
- `privy-auth-client.ts`: the only file that imports the Privy SDK.
- `authenticate.ts`: header parsing and token verification → an `AuthResult`.

Enforcement (`requireAuth` / `optionalAuth` / `getAuthUser`) is in
`middleware/auth.ts`. Mapping the Privy DID to a local user row is
`services/user-service.ts`. Authorization (may this user touch this resource?)
is a separate decision, made in each service.

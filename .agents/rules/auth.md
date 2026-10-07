---
paths:
  - "apps/web/src/**"
  - "apps/api/src/**"
  - "packages/shared/src/auth/**"
---
# Authentication (Privy)

Privy owns authentication: credentials, OTP, OAuth, session restoration. Never
reimplement any of it.

- **The client gate is UX, not security.** Every protected API operation
  authenticates AND authorizes on the server, independently.
- **Authentication is not authorization.** A verified token says who the caller
  is. Whether they may touch a resource (ownership, membership, role) is decided
  in the service that owns it, every time.

## Web
- `useAuth()` (`hooks/use-auth.ts`) is the only auth surface. Never import
  `@privy-io/react-auth` elsewhere; Biome enforces it.
- Gate redirects and signed-out renders on `isReady`.
- Call the API through `useApi()`, which attaches a fresh token per request.
  Never put a token in state, storage, logs, analytics, URLs or error messages.
- Never show a raw vendor error; `useAuth` already returns neutral values.
- Authenticated pages go in `app/(authenticated)/`, whose layout composes
  `AuthGate` → `OnboardingGate` → `AppShell`. Prompt in place; don't redirect.
  Product chrome stays inside the gates. (No page uses the group right now:
  account details moved to the Settings menu's Account tab. The gates stay
  for the next signed-in page.)
- Signed-out UI offers ONE button, **Sign In**, which opens
  `openModal(MODAL_KEY.SIGN_IN)`: `SignInModal`, two stacked sections. "Have an
  account?" → Sign In hands straight to Privy; "Create an Account" → Sign Up
  opens onboarding (`MODAL_KEY.ONBOARDING`), whose Continue opens
  `SignUpModal` (`MODAL_KEY.SIGN_UP`), the Privy hand-off. All are rendered
  once by `components/layout/RegisteredModals` in the root layout. Never build
  another auth modal or any credential/OTP UI.
- `isConfigured === false` (no `NEXT_PUBLIC_PRIVY_APP_ID`) is a dev affordance
  for booting without credentials, not an auth mode. Hide or explain auth UI.
- Login methods: `PRIVY_LOGIN_METHODS` in `constants/auth.ts`. A method must also
  be enabled (or disabled) in the Privy dashboard.

## API
- `requireAuth` on a route GROUP (`/rpc/*` already is), never per handler. Read
  the user with `getAuthUser(c)`; in oRPC procedures it's `context.user`.
- `optionalAuth` + `getOptionalAuthUser(c)` for public routes that vary by auth state.
- No Privy credentials → every protected route fails closed (503). Never add a
  bypass.
- Never decode token claims without verification; never log a token (logging
  the verified DID is fine).
- Only `auth/privy-auth-client.ts` imports `@privy-io/node`. Everything else
  depends on the `AuthClient` seam; tests use `test/fake-auth-client.ts`.
- The DID stops at the auth layer: services and tables use `users.id`. Foreign
  keys point at `users.id`, never at `privy_user_id`.

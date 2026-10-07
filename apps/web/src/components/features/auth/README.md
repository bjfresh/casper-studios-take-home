# features/auth/

- `AuthGate`: gates `(authenticated)` pages. Waits for `isReady`, then prompts
  in place when signed out, with the one Sign In button.
- `SignInModal` (`MODAL_KEY.SIGN_IN`): the signed-out entry point. "Have an
  account?" → Sign In (Privy); "Create an Account" → Sign Up (onboarding).
- `SignUpModal` (`MODAL_KEY.SIGN_UP`): ends onboarding by handing off to Privy
  to create the account.

Both are rendered by `components/layout/RegisteredModals`.

UX only: the API enforces auth independently. See `.agents/rules/auth.md`.

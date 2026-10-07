# features/onboarding/

- `OnboardingModal`: front-loaded onboarding, before an account exists.
  Settings go to localStorage, then the sign-up modal opens.
- `OnboardingGate`: inside AuthGate. Shows loading, saving and retry while
  `usePendingSettingsSync` saves a new account's settings (from the form, or
  this device's preferences).

See `.agents/rules/player-settings.md`.

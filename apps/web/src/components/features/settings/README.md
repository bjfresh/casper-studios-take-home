# features/settings/

- `PlayerSettingsFields` + `usePlayerSettingsForm`: the onboarding form
  (fields only): name, instrument and handedness.
- `DisplayNameField`: the name field alone; auto-saves when given `onCommit`.
- `AccountPanel`: the Settings menu's Account tab (name, email). Auto-saves.
- `apply-api-error.ts`: maps a failed save onto fields or the form.

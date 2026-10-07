---
paths:
  - "apps/web/src/components/features/settings/**"
  - "apps/web/src/components/features/onboarding/**"
  - "apps/web/src/data/**"
  - "apps/api/src/services/settings-service.ts"
  - "packages/shared/src/settings/**"
---
# Player settings and onboarding

Settings (name, guitar/bass, left/right-handed) are collected BEFORE sign-up and
saved to the database after it.

1. **Sign In** (signed out) opens the sign-in modal; its **Sign Up** opens `MODAL_KEY.ONBOARDING`. On Continue, the
   validated settings go to localStorage (`data/pending-settings.ts`) and the
   sign-up modal opens.
2. After sign-up, `AccountSync` (root layout) saves pending settings with
   `settings.save`, wherever sign-up finished, and removes the local copy only
   once the save succeeds. `OnboardingGate` shares the same hook for its status
   and retry.
3. If the account already has saved settings, those win and the pending copy is
   discarded. If there's nothing saved and nothing pending (a new player who
   chose Sign In and skipped the form), this device's preferences are saved
   with a starting name from the email (`nameFromEmail`), editable in Settings
   → Account. Pending settings are read when the account loads, not at page
   load, so a sign-up in the same visit is saved too.

Rules:
- One schema (`playerSettingsSchema` in `@repo/shared`) validates the form,
  localStorage, the API boundary and Settings. `DISPLAY_NAME_MAX_LENGTH` is the
  one source for the name limit.
- `PlayerSettingsFields` + `usePlayerSettingsForm` are the onboarding form.
  They render fields only, never the `<form>` (a modal's `<Modal formId>` owns
  it). `DisplayNameField` is the name on its own: a plain field there, and
  auto-saving (`onCommit`) in the Account tab.
- After onboarding there's no settings page. The Settings menu (popover) has
  two tabs for a signed-in player: **Preferences** (instrument, handedness,
  tuning, display) and **Account** (`AccountPanel`: the name, and the email,
  read-only). Never show the user's role. Guests see Preferences only, without
  a tab bar. The header's account action is just **Sign out**.
- Instrument and handedness are the same `TwoSidedSwitch`es as the Settings
  menu (`Guitar | Bass`, `Left | Right`), configured the same way: bass is
  shown but disabled, "(coming soon)", until bass lessons exist. Change them
  together.
- Settings auto-saves: a switch saves the moment it flips; the name saves on
  blur or Enter when changed and valid. On failure, revert to the saved value
  and show the error. The panel's close button reads **Save** (primary blue)
  once anything changed during this visit and **Done** (grey, secondary)
  otherwise; both only close, since everything is already saved. Nothing is
  staged. A signed-in player with no settings yet
  (signed in without onboarding) creates them with their first name save
  (`settings.save`, carrying this device's preferences).
- Onboarding's switches stage values for Continue. That's the one sanctioned
  exception to "a switch takes effect immediately" (a setup step whose values
  become live settings). Don't extend it to other forms.
- Database: `user_settings`, one row per user (`user_id` primary key), every
  column NOT NULL. `save` is an idempotent upsert; `update` patches an existing
  row and is a CONFLICT without one. Both act only on the caller's own row.

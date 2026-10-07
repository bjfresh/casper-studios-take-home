---
paths:
  - "apps/web/src/components/features/preferences/**"
  - "apps/web/src/hooks/use-preferences.ts"
  - "apps/web/src/data/guest-preferences.ts"
  - "apps/web/src/components/features/chords/**"
  - "apps/api/src/services/settings-service.ts"
  - "packages/shared/src/settings/**"
---
# Preferences: instrument and fretboard display

- **One shape for everyone.** `PlayerPreferences` (instrument, handedness,
  guitarType, bassStringCount, tuning, showNoteNames, showFingerNumbers,
  showIntervals) is the same for guests (localStorage, `guestPreferences`) and
  accounts (`user_settings`). Read and change it ONLY through
  `usePreferences()`. It picks the store, applies changes immediately
  (optimistic for accounts), and persists. Components never branch on auth.
- **One normalization rule.** `normalizePlayerPreferences` /
  `applyPreferencesUpdate` / `normalizeFretboardDisplaySettings` in
  `@repo/shared` are the only places that enforce:
  - note names and finger numbers are never both on (the newly chosen one
    wins; the DB check is the backstop)
  - guitar has no string count; bass always has one and no guitar type
  - the tuning fits the string count (standard tuning when it doesn't)

  Don't re-implement any of this in a component or service.
- **Note labels are ONE control** (`SegmentedControl`: Note names / Fingers /
  None), persisted as two booleans via `displayForMode`/`noteLabelMode`. Never
  two toggles. Intervals are a separate, independent switch.
- **Tunings are note arrays** (low → high), the same model as
  `chord_voicings.tuning`. Offer `TUNING_PRESETS` for the instrument and
  string count.
- **Lesson diagrams are drawn in the voicing's own tuning.** When the player's
  tuning differs, say so ("Shown in standard tuning") rather than redrawing a
  standard-tuning fingering in another tuning.
- **Intervals** come from each diagram note's `interval`, stamped by the
  curriculum sync from actual pitches. Display with `formatInterval`
  (b3 → ♭3). Never type interval text by hand.
- **Changing instrument never touches learning progress** (progress isn't
  stored in preferences).
- **Sign-up carries preferences.** Onboarding writes the profile plus the
  guest's current preferences to pending settings, and AccountSync saves them,
  so the display mode survives.
- The menu is a popover: it never navigates, and a lesson's position is
  local state it can't touch.

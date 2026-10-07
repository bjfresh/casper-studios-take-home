---
paths:
  - "apps/web/src/components/features/lessons/**"
  - "apps/web/src/app/(public)/**"
  - "apps/web/src/hooks/use-lesson-progress.ts"
  - "apps/web/src/data/local-storage.ts"
  - "apps/web/src/data/progress-outbox*.ts"
  - "apps/web/src/hooks/use-progress-sync.ts"
  - "apps/api/src/services/lesson-service.ts"
  - "apps/api/src/rpc/public-router.ts"
  - "packages/shared/src/curriculum/progress-rules.ts"
  - "packages/shared/src/curriculum/lessons.ts"
---
# Lessons: browse and play

The flow is: home (lesson grid) → `/lesson/<slug>` → one item at a time → Skip
or Got it → back to `/`.

- **Guests and accounts are equal citizens.** Content comes from the PUBLIC
  endpoint (`api.publicQuery`, `/public-rpc`): reference data only, never
  anything about a user. Progress goes through `useLessonRecorder` /
  `useLessonPlayRecords`. Components never branch on auth themselves.
- **Every play is stored on the device first** (`data/local-storage.ts`:
  localStorage through React Query, Zod-validated). Recording never waits on
  or fails with the network.
  - Guests: the shared rules update `STORAGE_KEYS.guestProgress`.
  - Accounts: the play joins the outbox (`data/progress-outbox.ts`, the exact
    `recordItem` / `finish` input plus `userId`), and `useProgressSync`
    (mounted by AccountSync) sends it in order, removing each only once the
    API confirms. Retryable failures stop and retry (online, tab visible, next
    play); a play the API can never accept is dropped. Web Locks keep two tabs
    from sending the same play.
  - The grid overlays queued plays on the account's progress (last played,
    play count), so it's right before they sync. Completion stays the
    server's call.
- **One set of progress rules** (`progress-rules.ts` in `@repo/shared`):
  - Got it: item learned (first time only), played, counted. The lesson's last
    played moves too.
  - Skip: records the skip only. Not practice, not learned, so it stays up for
    review.
  - Finish: lesson play count + 1 and last played. Completed only the first
    time every item has been learned (the server decides from stored item
    progress).

  The API applies the same rules in SQL (`lesson-service.ts`). Change both
  together.
- Guest progress is keyed by SLUG, in the exact shape
  `lessons.importGuestProgress` takes. `AccountSync` imports it after sign-up
  and clears it only on success.
- **Sign-up prompt.** A guest's FIRST finished lesson shows "Keep your
  progress" on the completion screen (`SignUpPrompt` / `useSignUpPrompt`):
  "Sign up for free", on the right, opens onboarding. No dismiss button: it
  shows once, after the first lesson only. Never for accounts, later lessons,
  or when auth isn't configured. It sits well below the navigation (a
  separate offer).
- **Lesson complete → Next lesson** (primary), the next by `sortOrder` for the
  instrument, from the same cached `lessons.list` query as the grid. Back to
  lessons only when there's no next lesson or the list can't load.
- Item progress uses the most specific table: chords → `user_chord_progress`,
  shapes → `user_chord_shape_progress`.
- URLs use the stable slug (`lessonRoute(slug)`), never names or ids. The
  route resolves on the server so unknown slugs get a real 404.
- Order lessons by `sortOrder`; display `lessonNumber`. Items keep membership
  order.
- Dates on cards go through `formatLastPlayed()` (`utils/relative-time.ts`).
  Never show a raw date, and never write another relative-date formatter.
- Diagrams get the item's own `tuning` and the player's `handedness`
  (`usePlayerPreferences`).

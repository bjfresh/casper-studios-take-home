---
paths:
  - "apps/api/src/curriculum/**"
  - "apps/api/src/services/curriculum*.ts"
  - "packages/shared/src/curriculum/**"
  - "packages/db/src/schema.ts"
---
# Chord curriculum

Five concepts, five homes. Don't merge them:

| Concept          | Table(s)                                   | Holds                                   |
| ---------------- | ------------------------------------------ | --------------------------------------- |
| Musical chord    | `chords`                                   | root + quality (slug/name derived)      |
| Voicing / shape  | `chord_shapes`                             | movable shapes; quality, strings, kind  |
| Curriculum group | `chord_groups`                             | name, lesson number, sort order, focus  |
| Membership       | `chord_group_chords`, `chord_group_shapes` | order in group, introduces / practices  |
| User progress    | `user_chord_group_progress`, `user_chord_progress` | completion, last played, count  |

- **Two numbers per group:** `lessonNumber` is what the learner sees ("Lesson
  4"; null for review/bonus groups) and `sortOrder` is where the app places it
  (spaced in tens). Always order by `sortOrder`; display `lessonNumber`. Both
  are unique per instrument, checked at commit, so a sync can swap them
  between rows. Insert a group between lessons with an unused `sortOrder`
  (e.g. 45), and renumber lessons in the source if it's on the main path.
- **Qualifiers are structured, never text.** Root string, inversion (0 = root
  position) and string set (`stringSetStart`/`stringSetEnd`) are fields on
  shapes (reusable geometry) and voicings (voicing-specific). `title` is the
  core concept only ("Major 7 Shell"), and `subtitle` is descriptive copy
  only ("Compact version"). Display text comes from `formatShapeQualifier()`
  in `@repo/shared`; never store or hand-write "6th-string root". The exact
  strings a shape uses stay in `strings` (a shell's 6-4-3 isn't a string set).
- **String-count limits are checked with the instrument in hand**
  (`validateShapeGeometry`, run by the sync), never as a global maximum in the
  database. Bass and future instruments differ.
- **Pending contract migration.** `chord_shapes.name` and
  `chord_shapes.inversion` (the word-valued enum) are deprecated. They're
  still written, for the previous release during a rolling deploy, but nothing
  reads them. In the NEXT release, add a migration dropping both columns and
  the `chord_inversion` type, and remove `name`/`legacyInversion` from the
  schema and the sync.
- **Edit the curriculum in `curriculum-source.ts`, never in the database.** Run
  `pnpm db:curriculum`. The sync upserts by slug (ids, and therefore user
  progress, survive edits) and never deletes; it reports orphans.
- A chord is **introduced** by exactly one group and may be **practiced** by
  later groups. A practice or progression group reuses chord records; it never
  duplicates them. The source tests enforce this.
- Movable concepts (barre shapes, triads, shells, jazz voicings) are
  `chord_shapes`, not fixed-root chords.
- Never put progress on curriculum rows. Progress FKs are `restrict` so
  removing a group can't silently delete progress.
- `recordGroupPractice` is the only writer of progress: SQL increments,
  first-completion-wins `completed_at`, and per-chord progress only for chords
  actually practiced, each validated as a member of the group.
- Review scheduling is the pluggable `ReviewPolicy` in `@repo/shared`. Swap
  the policy, not the schema or queries.
- New instrument, tuning, progression or voicing content: extend the enums and
  add source entries (bass groups set `instrument: 'bass'`). A new concept
  that isn't a chord or a shape (e.g. progressions with their own data) gets
  its own table and membership table, following the same pattern.

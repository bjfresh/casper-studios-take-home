// Type-level: checked by `tsc`, not executed. Each enum exists twice by design:
// as a Postgres enum in @repo/db and as a const object in @repo/shared, which
// must stay storage-agnostic. This keeps the pairs identical.
import type {
  chordGroupFocus,
  chordGroupMemberRole,
  chordInversion,
  chordQuality,
  chordShapeKind,
  handedness,
  instrument,
  noteName,
  userRole,
} from '@repo/db/schema'
import type {
  ChordGroupFocus,
  ChordGroupMemberRole,
  ChordInversion,
  ChordQuality,
  ChordShapeKind,
  Handedness,
  Instrument,
  NoteName,
  UserRole,
} from '@repo/shared'

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false
type Expect<T extends true> = T

export type Cases = [
  Expect<Equal<UserRole, (typeof userRole.enumValues)[number]>>,
  Expect<Equal<Instrument, (typeof instrument.enumValues)[number]>>,
  Expect<Equal<Handedness, (typeof handedness.enumValues)[number]>>,
  Expect<Equal<NoteName, (typeof noteName.enumValues)[number]>>,
  Expect<Equal<ChordQuality, (typeof chordQuality.enumValues)[number]>>,
  Expect<Equal<ChordShapeKind, (typeof chordShapeKind.enumValues)[number]>>,
  Expect<Equal<ChordInversion, (typeof chordInversion.enumValues)[number]>>,
  Expect<Equal<ChordGroupFocus, (typeof chordGroupFocus.enumValues)[number]>>,
  Expect<Equal<ChordGroupMemberRole, (typeof chordGroupMemberRole.enumValues)[number]>>,
]

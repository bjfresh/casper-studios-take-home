import type {
  ChordGroupFocus,
  ChordGroupMemberRole,
  ChordQuality,
  ChordShapeKind,
  Instrument,
  NoteName,
} from '@repo/shared'

/**
 * The guitar curriculum: the single source of truth for chords, shapes and
 * groups. `pnpm db:curriculum` syncs it into the database by slug. Edit here,
 * never in the database.
 *
 * Conventions:
 * - Chords are identified by root + quality; slug and display name are derived
 *   (chordSlug / chordSymbol in @repo/shared), so they can't disagree.
 * - A chord is INTRODUCED by exactly one group and may be PRACTICED by any
 *   later group (validated by curriculum-source.test.ts).
 * - Each group has an explicit `sortOrder` (where the app places it, spaced
 *   in tens so groups can be inserted between lessons) and `lessonNumber`
 *   (what the learner sees; null for review/bonus content off the main path).
 *   Keep the array in sortOrder order so the file reads like the curriculum.
 * - Strings are numbered 1 = highest-pitched; `strings` lists low → high.
 */

export type ChordSource = { root: NoteName; quality: ChordQuality }

export type ShapeSource = {
  slug: string
  /** The core concept only ("Major 7 Shell"). Qualifiers go in the fields below. */
  title: string
  /** Descriptive copy that doesn't warrant a field ("Compact version"). Rare. */
  subtitle?: string
  quality: ChordQuality
  kind: ChordShapeKind
  instrument?: Instrument
  rootString: number | null
  /** 0 = root position, 1 = first inversion, … */
  inversion?: number
  stringSetStart?: number
  stringSetEnd?: number
  strings: number[]
  description: string
}

type MemberRef<Key extends string> = { [K in Key]: string } & { role?: ChordGroupMemberRole }

export type GroupSource = {
  slug: string
  name: string
  /** User-facing "Lesson N". Null for review, bonus and optional groups. */
  lessonNumber: number | null
  /** Internal position. Unique per instrument; leave gaps for insertions. */
  sortOrder: number
  description: string
  focus: ChordGroupFocus
  instrument?: Instrument
  /** Chord slugs, in teaching order. Role defaults to 'introduces'. */
  chords?: Array<MemberRef<'chord'>>
  /** Shape slugs, in teaching order. Role defaults to 'introduces'. */
  shapes?: Array<MemberRef<'shape'>>
}

export type CurriculumSource = {
  chords: ChordSource[]
  shapes: ShapeSource[]
  groups: GroupSource[]
}

const intro = (chord: string) => ({ chord })
const practice = (chord: string) => ({ chord, role: 'practices' as const })
const shape = (slug: string) => ({ shape: slug })

const SIX = [6, 5, 4, 3, 2, 1]
const FIVE_FROM_A = [5, 4, 3, 2, 1]
const TOP_THREE = [3, 2, 1]
const TOP_THREE_SET = { stringSetStart: 1, stringSetEnd: 3 }

export const CURRICULUM: CurriculumSource = {
  chords: [
    { root: 'G', quality: 'major' },
    { root: 'C', quality: 'major' },
    { root: 'D', quality: 'major' },
    { root: 'E', quality: 'minor' },
    { root: 'A', quality: 'minor' },
    { root: 'D', quality: 'minor' },
    { root: 'E', quality: 'major' },
    { root: 'A', quality: 'major' },
    { root: 'E', quality: 'dominant_7' },
    { root: 'A', quality: 'dominant_7' },
    { root: 'D', quality: 'dominant_7' },
    { root: 'G', quality: 'dominant_7' },
    { root: 'E', quality: 'power' },
    { root: 'A', quality: 'power' },
    { root: 'D', quality: 'power' },
    { root: 'F', quality: 'major' },
    { root: 'B', quality: 'minor' },
    { root: 'A', quality: 'minor_7' },
    { root: 'E', quality: 'minor_7' },
    { root: 'C', quality: 'major_7' },
    { root: 'D', quality: 'minor_7' },
  ],

  shapes: [
    // Movable barre shapes, named for the open chord they're built from.
    {
      slug: 'e-shape-major',
      title: 'E-Shape Major',
      quality: 'major',
      kind: 'barre',
      rootString: 6,
      strings: SIX,
      description: 'Open E major moved up the neck behind a full barre.',
    },
    {
      slug: 'e-shape-minor',
      title: 'E-Shape Minor',
      quality: 'minor',
      kind: 'barre',
      rootString: 6,
      strings: SIX,
      description: 'Open E minor moved up the neck behind a full barre.',
    },
    {
      slug: 'a-shape-major',
      title: 'A-Shape Major',
      quality: 'major',
      kind: 'barre',
      rootString: 5,
      strings: FIVE_FROM_A,
      description: 'Open A major moved up the neck.',
    },
    {
      slug: 'a-shape-minor',
      title: 'A-Shape Minor',
      quality: 'minor',
      kind: 'barre',
      rootString: 5,
      strings: FIVE_FROM_A,
      description: 'Open A minor moved up the neck.',
    },

    // Triads on strings 1–3, in each inversion. The inversion and string set
    // place the root, so rootString stays null (no redundant qualifier).
    {
      slug: 'triad-major-top-root',
      title: 'Major Triad',
      quality: 'major',
      kind: 'triad',
      rootString: null,
      inversion: 0,
      ...TOP_THREE_SET,
      strings: TOP_THREE,
      description: 'Root, third, fifth from low to high.',
    },
    {
      slug: 'triad-major-top-first',
      title: 'Major Triad',
      quality: 'major',
      kind: 'triad',
      rootString: null,
      inversion: 1,
      ...TOP_THREE_SET,
      strings: TOP_THREE,
      description: 'Third in the bass; root on top.',
    },
    {
      slug: 'triad-major-top-second',
      title: 'Major Triad',
      quality: 'major',
      kind: 'triad',
      rootString: null,
      inversion: 2,
      ...TOP_THREE_SET,
      strings: TOP_THREE,
      description: 'Fifth in the bass; root in the middle.',
    },
    {
      slug: 'triad-minor-top-root',
      title: 'Minor Triad',
      quality: 'minor',
      kind: 'triad',
      rootString: null,
      inversion: 0,
      ...TOP_THREE_SET,
      strings: TOP_THREE,
      description: 'Root, flat third, fifth from low to high.',
    },
    {
      slug: 'triad-minor-top-first',
      title: 'Minor Triad',
      quality: 'minor',
      kind: 'triad',
      rootString: null,
      inversion: 1,
      ...TOP_THREE_SET,
      strings: TOP_THREE,
      description: 'Flat third in the bass; root on top.',
    },
    {
      slug: 'triad-minor-top-second',
      title: 'Minor Triad',
      quality: 'minor',
      kind: 'triad',
      rootString: null,
      inversion: 2,
      ...TOP_THREE_SET,
      strings: TOP_THREE,
      description: 'Fifth in the bass; root in the middle.',
    },

    // Shells: root on the 6th string, 7th on the 4th, 3rd on the 3rd. Not a
    // contiguous string set (6, 4, 3), so no stringSet: `strings` has it exactly.
    {
      slug: 'shell-maj7-root-6',
      title: 'Major 7 Shell',
      quality: 'major_7',
      kind: 'shell',
      rootString: 6,
      strings: [6, 4, 3],
      description: 'Root, major seventh, major third.',
    },
    {
      slug: 'shell-m7-root-6',
      title: 'Minor 7 Shell',
      quality: 'minor_7',
      kind: 'shell',
      rootString: 6,
      strings: [6, 4, 3],
      description: 'Root, flat seventh, flat third.',
    },
    {
      slug: 'shell-7-root-6',
      title: 'Dominant 7 Shell',
      quality: 'dominant_7',
      kind: 'shell',
      rootString: 6,
      strings: [6, 4, 3],
      description: 'Root, flat seventh, major third.',
    },

    // Jazz colours as movable voicings, root on the 5th string.
    {
      slug: 'm7b5-root-5',
      title: 'Minor 7♭5',
      quality: 'half_diminished_7',
      kind: 'voicing',
      rootString: 5,
      strings: [5, 4, 3, 2],
      description: 'Half-diminished: the ii chord in minor keys.',
    },
    {
      slug: 'maj6-root-5',
      title: 'Major 6',
      quality: 'major_6',
      kind: 'voicing',
      rootString: 5,
      strings: FIVE_FROM_A,
      description: 'Major triad with an added sixth.',
    },
    {
      slug: 'm6-root-5',
      title: 'Minor 6',
      quality: 'minor_6',
      kind: 'voicing',
      rootString: 5,
      strings: FIVE_FROM_A,
      description: 'Minor triad with a major sixth.',
    },
    {
      slug: 'dom9-root-5',
      title: 'Dominant 9',
      quality: 'dominant_9',
      kind: 'voicing',
      rootString: 5,
      strings: [5, 4, 3, 2],
      description: 'Dominant seventh with an added ninth.',
    },
  ],

  groups: [
    {
      slug: 'first-chords',
      lessonNumber: 1,
      sortOrder: 10,
      name: 'First Chords',
      focus: 'chords',
      description:
        'Three of the most useful open major chords. Together they play simple I–IV–V progressions in G.',
      chords: [intro('g-major'), intro('c-major'), intro('d-major')],
    },
    {
      slug: 'first-minors',
      lessonNumber: 2,
      sortOrder: 20,
      name: 'First Minors',
      focus: 'chords',
      description: 'Two easy minor chords that build directly on your first three.',
      chords: [intro('e-minor'), intro('a-minor')],
    },
    {
      slug: 'the-c-family',
      lessonNumber: 3,
      sortOrder: 30,
      name: 'The C Family',
      focus: 'chords',
      description:
        'More open chords around C major and A minor, without the difficult F barre chord yet.',
      chords: [intro('d-minor'), intro('e-major')],
    },
    {
      slug: 'the-a-family',
      lessonNumber: 4,
      sortOrder: 40,
      name: 'The A Family',
      focus: 'chords',
      description: 'Unlocks common progressions in A and introduces the dominant seventh sound.',
      chords: [intro('a-major'), intro('e7')],
    },
    {
      slug: 'seventh-chords',
      lessonNumber: 5,
      sortOrder: 50,
      name: 'Seventh Chords',
      focus: 'chords',
      description: 'Dominant sevenths for blues, folk and country progressions.',
      chords: [intro('a7'), intro('d7'), intro('g7')],
    },
    {
      slug: 'power-chords',
      lessonNumber: 6,
      sortOrder: 60,
      name: 'Power Chords',
      focus: 'chords',
      description: 'Root and fifth only. The first step toward movable chord shapes.',
      chords: [intro('e5'), intro('a5'), intro('d5')],
    },
    {
      slug: 'the-missing-chords',
      lessonNumber: 7,
      sortOrder: 70,
      name: 'The Missing Chords',
      focus: 'chords',
      description:
        'The two common beginner chords usually postponed because they need barre technique.',
      chords: [intro('f-major'), intro('b-minor')],
    },
    {
      slug: 'movable-major-and-minor',
      lessonNumber: 8,
      sortOrder: 80,
      name: 'Movable Major & Minor',
      focus: 'shapes',
      description:
        'E-shape and A-shape barre chords: four shapes that play any major or minor chord.',
      shapes: [
        shape('e-shape-major'),
        shape('e-shape-minor'),
        shape('a-shape-major'),
        shape('a-shape-minor'),
      ],
    },
    {
      slug: 'small-chords',
      lessonNumber: 9,
      sortOrder: 90,
      name: 'Small Chords',
      focus: 'shapes',
      description:
        'Compact major and minor triads on the top strings, with their inversions, for moving around the fretboard.',
      shapes: [
        shape('triad-major-top-root'),
        shape('triad-major-top-first'),
        shape('triad-major-top-second'),
        shape('triad-minor-top-root'),
        shape('triad-minor-top-first'),
        shape('triad-minor-top-second'),
      ],
    },
    {
      slug: 'major-and-minor-sevenths',
      lessonNumber: 10,
      sortOrder: 100,
      name: 'Major & Minor Sevenths',
      focus: 'chords',
      description: 'Common seventh-chord sounds in approachable open voicings.',
      chords: [intro('am7'), intro('em7'), intro('cmaj7'), intro('dm7')],
    },
    {
      slug: 'shell-chords',
      lessonNumber: 11,
      sortOrder: 110,
      name: 'Shell Chords',
      focus: 'shapes',
      description: 'Root, third and seventh only: the foundation of jazz harmony.',
      shapes: [shape('shell-maj7-root-6'), shape('shell-m7-root-6'), shape('shell-7-root-6')],
    },
    {
      slug: 'ii-v-i',
      lessonNumber: 12,
      sortOrder: 120,
      name: 'ii–V–I',
      focus: 'progression',
      description: 'The most important progression in jazz, built from chords you already know.',
      chords: [practice('dm7'), practice('g7'), practice('cmaj7')],
    },
    {
      slug: 'jazz-colors',
      lessonNumber: 13,
      sortOrder: 130,
      name: 'Jazz Colors',
      focus: 'shapes',
      description: 'Half-diminished, sixth and ninth chords for a jazzier vocabulary.',
      shapes: [
        shape('m7b5-root-5'),
        shape('maj6-root-5'),
        shape('m6-root-5'),
        shape('dom9-root-5'),
      ],
    },
  ],
}

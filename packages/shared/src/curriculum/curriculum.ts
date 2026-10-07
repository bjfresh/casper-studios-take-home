import { z } from 'zod'
import type { Prettify } from '../platform/type-utilities'
import { INSTRUMENTS } from '../settings/settings'
import { CHORD_QUALITIES, NOTE_NAMES } from './chords'
import { shapeQualifiersSchema } from './qualifiers'

/** How a movable shape is built. Each kind maps to a future group type in the brief. */
export const CHORD_SHAPE_KINDS = {
  /** E-shape / A-shape barre chords. */
  BARRE: 'barre',
  /** Three-note voicings on a string set. */
  TRIAD: 'triad',
  /** Root, third and seventh only. */
  SHELL: 'shell',
  /** Any other movable voicing (jazz colours, extensions). */
  VOICING: 'voicing',
} as const

export type ChordShapeKind = (typeof CHORD_SHAPE_KINDS)[keyof typeof CHORD_SHAPE_KINDS]

/**
 * @deprecated Word-valued inversions, kept only to mirror the legacy
 * `chord_shapes.inversion` column until it's dropped. Use the numeric
 * `inversion` in ShapeQualifiers (0 = root position).
 */
export const CHORD_INVERSIONS = {
  ROOT: 'root',
  FIRST: 'first',
  SECOND: 'second',
  THIRD: 'third',
} as const

export type ChordInversion = (typeof CHORD_INVERSIONS)[keyof typeof CHORD_INVERSIONS]

/** What a group is about. Doesn't change how membership works; it's for presentation. */
export const CHORD_GROUP_FOCUS = {
  CHORDS: 'chords',
  SHAPES: 'shapes',
  /** Practice built from chords introduced earlier (e.g. ii–V–I). */
  PROGRESSION: 'progression',
} as const

export type ChordGroupFocus = (typeof CHORD_GROUP_FOCUS)[keyof typeof CHORD_GROUP_FOCUS]

/**
 * Why an item is in a group. A chord is INTRODUCED once in the curriculum and
 * may be PRACTICED by any later group — which is how a group can be pure
 * practice without duplicating chord records.
 */
export const CHORD_GROUP_MEMBER_ROLES = {
  INTRODUCES: 'introduces',
  PRACTICES: 'practices',
} as const

export type ChordGroupMemberRole =
  (typeof CHORD_GROUP_MEMBER_ROLES)[keyof typeof CHORD_GROUP_MEMBER_ROLES]

export const chordSchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  name: z.string(),
  root: z.enum(NOTE_NAMES),
  quality: z.enum(CHORD_QUALITIES),
})

export type Chord = z.infer<typeof chordSchema>

export const chordShapeSchema = z
  .object({
    id: z.uuid(),
    slug: z.string(),
    /** The core concept: "Major 7 Shell". Qualifiers are NOT part of it. */
    title: z.string(),
    /** Descriptive copy only ("Compact version"), never a qualifier with its own field. */
    subtitle: z.string().nullable(),
    quality: z.enum(CHORD_QUALITIES),
    shapeType: z.enum(CHORD_SHAPE_KINDS),
    instrument: z.enum(INSTRUMENTS),
    /** Strings the shape uses, low to high (may be non-contiguous, e.g. a 6-4-3 shell). */
    strings: z.array(z.number().int()),
    description: z.string().nullable(),
  })
  .extend(shapeQualifiersSchema.shape)

export type ChordShape = z.infer<typeof chordShapeSchema>

/** A group's member: a fixed chord or a movable shape. Narrow on `type`. */
export const chordGroupItemSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('chord'),
    role: z.enum(CHORD_GROUP_MEMBER_ROLES),
    chord: chordSchema,
  }),
  z.object({
    type: z.literal('shape'),
    role: z.enum(CHORD_GROUP_MEMBER_ROLES),
    shape: chordShapeSchema,
  }),
])

export type ChordGroupItem = z.infer<typeof chordGroupItemSchema>

/** One user's progress on one group. Absent (null) until the group is first practiced. */
export const chordGroupProgressSchema = z.object({
  /** The FIRST time the group was completed. Never moves once set. */
  completedAt: z.date().nullable(),
  lastPlayedAt: z.date().nullable(),
  playCount: z.number().int().nonnegative(),
})

export type ChordGroupProgress = z.infer<typeof chordGroupProgressSchema>

export const curriculumGroupSchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  /** What the learner sees: "Lesson 4". Null for review/bonus groups off the main path. */
  lessonNumber: z.number().int().positive().nullable(),
  /** Internal position. Order by this, never by lessonNumber. */
  sortOrder: z.number().int(),
  focus: z.enum(CHORD_GROUP_FOCUS),
  instrument: z.enum(INSTRUMENTS),
  items: z.array(chordGroupItemSchema),
  progress: chordGroupProgressSchema.nullable(),
})

export type CurriculumGroup = Prettify<z.infer<typeof curriculumGroupSchema>>

export const curriculumListInputSchema = z
  .object({ instrument: z.enum(INSTRUMENTS).default('guitar') })
  .default({ instrument: 'guitar' })

/** The most chords one practice session can report on. Groups are small. */
export const MAX_CHORDS_PER_PRACTICE = 16

export const recordPracticeInputSchema = z.object({
  groupId: z.uuid(),
  /** True when this session completes the group. The first completion is kept. */
  completed: z.boolean().default(false),
  /**
   * Chords actually practiced in this session, when known. A session can cover
   * a group without touching every chord in it; per-chord progress is only
   * recorded for these. Each must belong to the group.
   */
  chordIds: z.array(z.uuid()).max(MAX_CHORDS_PER_PRACTICE).default([]),
})

export type RecordPracticeInput = z.infer<typeof recordPracticeInputSchema>

export const reviewCandidateSchema = z.object({
  groupId: z.uuid(),
  slug: z.string(),
  name: z.string(),
  lessonNumber: z.number().int().positive().nullable(),
  sortOrder: z.number().int(),
  progress: chordGroupProgressSchema,
  intervalDays: z.number(),
  /** When the group became due. Earlier = more overdue. */
  dueAt: z.date(),
})

export type ReviewCandidate = z.infer<typeof reviewCandidateSchema>

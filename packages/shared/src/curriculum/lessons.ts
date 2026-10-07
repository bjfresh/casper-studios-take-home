import { z } from 'zod'
import { INSTRUMENTS } from '../settings/settings'
import { CHORD_GROUP_FOCUS, CHORD_GROUP_MEMBER_ROLES } from './curriculum'
import { CHORD_INTERVALS } from './intervals'
import { shapeQualifiersSchema } from './qualifiers'

/**
 * One played or open note in a diagram. Strings are numbered 1 = highest-
 * pitched (the curriculum-wide convention).
 */
export const fretPositionSchema = z.object({
  string: z.number().int().min(1),
  /** 0 = open string. */
  fret: z.number().int().min(0).max(30),
  isRoot: z.boolean().optional(),
  finger: z
    .union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal('T')])
    .optional(),
  note: z.string().optional(),
  /** Relative to the chord's root, e.g. '1', 'b3', '5'. Shown under the marker when enabled. */
  interval: z.enum(CHORD_INTERVALS).optional(),
})

export type FretPosition = z.infer<typeof fretPositionSchema>

/**
 * What a chord diagram draws. Stored as JSON (chord_voicings.diagram,
 * chord_shapes.diagram) and validated whenever it's read back, since persisted
 * data is a boundary like any other.
 */
export const chordDiagramSchema = z.object({
  positions: z.array(fretPositionSchema),
  /** Strings explicitly not played (×). Unplayed strings not listed show nothing. */
  mutedStrings: z.array(z.number().int().min(1)).default([]),
  /** For movable shapes: the chord the example is drawn as, e.g. "A". */
  exampleName: z.string().optional(),
})

export type ChordDiagramData = z.infer<typeof chordDiagramSchema>

/** One thing to practice in a lesson: a fixed chord or a movable shape. */
export const lessonItemSchema = z
  .object({
    type: z.enum(['chord', 'shape']),
    id: z.uuid(),
    slug: z.string(),
    /** The core concept: a chord symbol (G, Cmaj7) or shape title (Major 7 Shell). */
    title: z.string(),
    /** Descriptive copy only; qualifiers come from the structured fields. */
    subtitle: z.string().nullable(),
    role: z.enum(CHORD_GROUP_MEMBER_ROLES),
    /** Null when no fingering exists yet; the lesson shows the name only. */
    diagram: chordDiagramSchema.nullable(),
    /** Open-string notes, low → high, that the diagram is drawn for. */
    tuning: z.array(z.string()).min(1),
  })
  // Shapes carry their own geometry; chords carry their default voicing's.
  .extend(shapeQualifiersSchema.shape)

export type LessonItem = z.infer<typeof lessonItemSchema>

/** Public lesson content: no user data, readable without an account. */
export const lessonContentSchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  lessonNumber: z.number().int().positive().nullable(),
  sortOrder: z.number().int(),
  focus: z.enum(CHORD_GROUP_FOCUS),
  instrument: z.enum(INSTRUMENTS),
  /** In curriculum order (membership sortOrder). */
  items: z.array(lessonItemSchema),
})

export type LessonContent = z.infer<typeof lessonContentSchema>

export const lessonSlugInputSchema = z.object({ slug: z.string().min(1).max(100) })

export const lessonsListInputSchema = z
  .object({ instrument: z.enum(INSTRUMENTS).default('guitar') })
  .default({ instrument: 'guitar' })

export const ITEM_RESULTS = { GOT_IT: 'got_it', SKIPPED: 'skipped' } as const
export type ItemResult = (typeof ITEM_RESULTS)[keyof typeof ITEM_RESULTS]

export const recordItemInputSchema = z.object({
  groupId: z.uuid(),
  item: z.object({ type: z.enum(['chord', 'shape']), id: z.uuid() }),
  result: z.enum(ITEM_RESULTS),
})

export type RecordItemInput = z.infer<typeof recordItemInputSchema>

export const finishLessonInputSchema = z.object({ groupId: z.uuid() })

/** A lesson's progress for the lesson grid, keyed by slug. */
export const lessonProgressSchema = z.object({
  slug: z.string(),
  completedAt: z.date().nullable(),
  lastPlayedAt: z.date().nullable(),
  playCount: z.number().int().nonnegative(),
})

export type LessonProgress = z.infer<typeof lessonProgressSchema>

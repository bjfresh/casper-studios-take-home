import { z } from 'zod'
import { authenticatedUserSchema } from '../auth/auth'
import type { Prettify } from '../platform/type-utilities'

export const INSTRUMENTS = {
  GUITAR: 'guitar',
  BASS: 'bass',
} as const

export type Instrument = (typeof INSTRUMENTS)[keyof typeof INSTRUMENTS]

export const HANDEDNESS = {
  RIGHT: 'right',
  LEFT: 'left',
} as const

export type Handedness = (typeof HANDEDNESS)[keyof typeof HANDEDNESS]

/** One source for the limit, used by the schema AND the input's maxLength. */
export const DISPLAY_NAME_MAX_LENGTH = 50

export const GUITAR_TYPES = {
  ACOUSTIC: 'acoustic',
  ELECTRIC: 'electric',
  BOTH: 'both',
} as const

export type GuitarType = (typeof GUITAR_TYPES)[keyof typeof GUITAR_TYPES]

export const BASS_STRING_COUNTS = [4, 5, 6] as const
export type BassStringCount = (typeof BASS_STRING_COUNTS)[number]

const noteName = z.string().regex(/^[A-G][♯♭#b]?$/, 'Not a note name')

/**
 * What each fretboard note shows. Note names and finger numbers share the
 * inside of the marker, so at most one of them is on: an invariant enforced
 * by normalizeFretboardDisplaySettings (and a database check). Intervals sit
 * under the marker and combine freely with either.
 */
export const fretboardDisplaySchema = z.object({
  showNoteNames: z.boolean(),
  showFingerNumbers: z.boolean(),
  showIntervals: z.boolean(),
})

export type FretboardDisplaySettings = z.infer<typeof fretboardDisplaySchema>

/** Seconds each chord stays up before a lesson auto-advances. 0 = off. */
export const AUTO_PROGRESS_MIN_SECONDS = 3
export const AUTO_PROGRESS_MAX_SECONDS = 30

export const autoProgressSecondsSchema = z
  .number()
  .int()
  .refine(
    (seconds) =>
      seconds === 0 ||
      (seconds >= AUTO_PROGRESS_MIN_SECONDS && seconds <= AUTO_PROGRESS_MAX_SECONDS),
    `Off, or ${AUTO_PROGRESS_MIN_SECONDS}–${AUTO_PROGRESS_MAX_SECONDS} seconds`,
  )

/**
 * Instrument and display preferences: the same shape for guests (localStorage)
 * and accounts (user_settings).
 */
export const playerPreferencesSchema = z
  .object({
    instrument: z.enum(INSTRUMENTS),
    handedness: z.enum(HANDEDNESS),
    /** Guitar only. Null until chosen, and always null for bass. */
    guitarType: z.enum(GUITAR_TYPES).nullable(),
    /** Bass only. Null for guitar. */
    bassStringCount: z.union([z.literal(4), z.literal(5), z.literal(6)]).nullable(),
    /** Open-string notes, low → high (same model as chord_voicings.tuning). */
    tuning: z.array(noteName).min(1).max(12),
    /** Lesson pace: seconds per chord before auto-advancing; 0 = off. */
    autoProgressSeconds: autoProgressSecondsSchema,
  })
  .extend(fretboardDisplaySchema.shape)

export type PlayerPreferences = z.infer<typeof playerPreferencesSchema>

/** The onboarding fields: who the player is, plus the two choices asked up front. */
export const playerProfileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, 'Enter your name')
    .max(DISPLAY_NAME_MAX_LENGTH, `Keep it under ${DISPLAY_NAME_MAX_LENGTH} characters`),
  instrument: z.enum(INSTRUMENTS),
  handedness: z.enum(HANDEDNESS),
})

export type PlayerProfile = z.infer<typeof playerProfileSchema>

/** Everything saved for an account: the profile plus every preference. */
export const playerSettingsSchema = playerProfileSchema.extend(playerPreferencesSchema.shape)

export type PlayerSettings = z.infer<typeof playerSettingsSchema>

/**
 * What creating settings accepts: the profile, plus whichever preferences the
 * player already has (a guest's choices travel with them). Missing ones get
 * defaults, and the whole thing is normalized on the server.
 */
// Preferences first, then the profile: extending in this order keeps the
// profile's instrument and handedness REQUIRED (the later shape wins).
export const playerSettingsInputSchema = playerPreferencesSchema
  .partial()
  .extend(playerProfileSchema.shape)

export type PlayerSettingsInput = z.infer<typeof playerSettingsInputSchema>

/** Settings change one or a few fields at a time: partial, but never empty. */
export const playerSettingsUpdateSchema = playerSettingsSchema
  .partial()
  .refine((update) => Object.values(update).some((value) => value !== undefined), {
    message: 'Nothing to update',
  })

export type PlayerSettingsUpdate = z.infer<typeof playerSettingsUpdateSchema>

/**
 * The signed-in user plus their saved settings. `settings: null` means the
 * account exists but nothing has been saved yet (onboarding still pending).
 */
export const accountSchema = authenticatedUserSchema.extend({
  settings: playerSettingsSchema.nullable(),
})

export type Account = Prettify<z.infer<typeof accountSchema>>

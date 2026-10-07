import type { BassStringCount, FretboardDisplaySettings, PlayerPreferences } from './settings'
import { sameTuning, standardTuning, stringCountFor } from './tunings'

/** Beginner-friendly defaults: right-handed guitar, standard tuning, note names in the markers. */
export const DEFAULT_PREFERENCES: PlayerPreferences = {
  instrument: 'guitar',
  handedness: 'right',
  guitarType: null,
  bassStringCount: null,
  tuning: standardTuning('guitar', 6),
  showNoteNames: true,
  showFingerNumbers: false,
  showIntervals: false,
  // Off by default: a beginner moves on when they're ready.
  autoProgressSeconds: 0,
}

/**
 * The slider's stops. Non-linear on purpose: 3 vs 4 vs 5 seconds is a real
 * difference in a chord-change drill; 28 vs 29 isn't. 0 is Off.
 */
export const AUTO_PROGRESS_STEPS = [0, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30] as const

/** "Off" or "10s". */
export function formatAutoProgress(seconds: number): string {
  return seconds === 0 ? 'Off' : `${seconds}s`
}

/** The nearest slider stop, so any stored value maps onto the control. */
export function nearestAutoProgressStep(seconds: number): number {
  return AUTO_PROGRESS_STEPS.reduce((best, step) =>
    Math.abs(step - seconds) < Math.abs(best - seconds) ? step : best,
  )
}

/** The one mutually exclusive choice for the inside of a note marker. */
export type NoteLabelMode = 'notes' | 'fingers' | 'none'

/** Which label the player just chose, for when two conflict. */
export type DisplayPreference = 'noteNames' | 'fingerNumbers'

/**
 * THE rule that note names and finger numbers are never both on: they occupy
 * the same space inside a marker. Every write path calls this (guest storage,
 * the settings menu, onboarding, the API, the migration's defaults), so no UI
 * component re-implements it. When both arrive on, `prefer` says which was
 * just chosen; otherwise note names (the default) win.
 */
export function normalizeFretboardDisplaySettings(
  settings: FretboardDisplaySettings,
  prefer: DisplayPreference = 'noteNames',
): FretboardDisplaySettings {
  if (settings.showNoteNames && settings.showFingerNumbers) {
    return {
      ...settings,
      showNoteNames: prefer === 'noteNames',
      showFingerNumbers: prefer === 'fingerNumbers',
    }
  }
  return settings
}

export function noteLabelMode({
  showNoteNames,
  showFingerNumbers,
}: FretboardDisplaySettings): NoteLabelMode {
  return showNoteNames ? 'notes' : showFingerNumbers ? 'fingers' : 'none'
}

/** A mode back to its two persisted booleans (always a valid pair). */
export function displayForMode(
  mode: NoteLabelMode,
): Pick<FretboardDisplaySettings, 'showNoteNames' | 'showFingerNumbers'> {
  return { showNoteNames: mode === 'notes', showFingerNumbers: mode === 'fingers' }
}

/**
 * Makes a preferences object internally consistent: guitar has no string
 * count, bass always has one (default 4) and no guitar type, the tuning fits
 * the string count (standard if it doesn't), and the display labels are
 * exclusive. Changing instrument keeps every other choice; it never touches
 * learning progress, which isn't stored here.
 */
export function normalizePlayerPreferences<T extends PlayerPreferences>(
  preferences: T,
  { prefer }: { prefer?: DisplayPreference } = {},
): T {
  const isBass = preferences.instrument === 'bass'
  const bassStringCount: BassStringCount | null = isBass ? (preferences.bassStringCount ?? 4) : null
  const stringCount = stringCountFor(preferences.instrument, bassStringCount)
  const tuning =
    preferences.tuning.length === stringCount
      ? preferences.tuning
      : standardTuning(preferences.instrument, stringCount)

  // Below the minimum isn't a pace, it's off; above the maximum clamps.
  const seconds = preferences.autoProgressSeconds ?? 0
  const autoProgressSeconds = seconds < 3 ? 0 : Math.min(30, Math.round(seconds))

  return {
    ...preferences,
    ...normalizeFretboardDisplaySettings(preferences, prefer),
    autoProgressSeconds,
    guitarType: isBass ? null : preferences.guitarType,
    bassStringCount,
    tuning,
  }
}

/** Which label a partial update just turned on, so normalization keeps it. */
export function preferenceFromUpdate(
  update: Partial<FretboardDisplaySettings>,
): DisplayPreference | undefined {
  if (update.showFingerNumbers === true) return 'fingerNumbers'
  if (update.showNoteNames === true) return 'noteNames'
  return undefined
}

/** Applies a partial change and normalizes the result. Used by every settings writer. */
export function applyPreferencesUpdate<T extends PlayerPreferences>(
  current: T,
  update: Partial<T>,
): T {
  const merged = { ...current, ...update }
  // A new string count without a new tuning means "standard for that count".
  if (
    update.bassStringCount !== undefined &&
    update.tuning === undefined &&
    update.bassStringCount !== current.bassStringCount
  ) {
    merged.tuning = standardTuning('bass', update.bassStringCount ?? 4)
  }
  // Switching instrument without a tuning: standard for the new instrument.
  if (
    update.instrument !== undefined &&
    update.instrument !== current.instrument &&
    update.tuning === undefined
  ) {
    merged.tuning = standardTuning(
      update.instrument,
      stringCountFor(update.instrument, merged.bassStringCount ?? 4),
    )
  }
  return normalizePlayerPreferences(merged, { prefer: preferenceFromUpdate(update) })
}

export { sameTuning }

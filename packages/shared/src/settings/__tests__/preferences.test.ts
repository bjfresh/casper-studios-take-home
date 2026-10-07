import { describe, expect, it } from 'vitest'
import {
  applyPreferencesUpdate,
  DEFAULT_PREFERENCES,
  displayForMode,
  normalizeFretboardDisplaySettings,
  normalizePlayerPreferences,
  noteLabelMode,
} from '../preferences'
import { findTuningPreset, standardTuning } from '../tunings'

describe('normalizeFretboardDisplaySettings', () => {
  const both = { showNoteNames: true, showFingerNumbers: true, showIntervals: true }

  it('never allows note names and finger numbers together', () => {
    expect(normalizeFretboardDisplaySettings(both)).toEqual({
      showNoteNames: true,
      showFingerNumbers: false,
      showIntervals: true,
    })
  })

  it('keeps the label the player just chose', () => {
    expect(normalizeFretboardDisplaySettings(both, 'fingerNumbers')).toMatchObject({
      showNoteNames: false,
      showFingerNumbers: true,
    })
  })

  it('leaves every valid combination alone (intervals are independent)', () => {
    for (const mode of ['notes', 'fingers', 'none'] as const) {
      for (const showIntervals of [true, false]) {
        const settings = { ...displayForMode(mode), showIntervals }
        expect(normalizeFretboardDisplaySettings(settings)).toEqual(settings)
        expect(noteLabelMode(settings)).toBe(mode)
      }
    }
  })
})

describe('normalizePlayerPreferences', () => {
  it('defaults are already normal, and beginner-friendly', () => {
    expect(normalizePlayerPreferences(DEFAULT_PREFERENCES)).toEqual(DEFAULT_PREFERENCES)
    expect(noteLabelMode(DEFAULT_PREFERENCES)).toBe('notes')
  })

  it('bass always has a string count and no guitar type; the tuning fits', () => {
    expect(
      normalizePlayerPreferences({
        ...DEFAULT_PREFERENCES,
        instrument: 'bass',
        guitarType: 'electric',
      }),
    ).toMatchObject({ bassStringCount: 4, guitarType: null, tuning: ['E', 'A', 'D', 'G'] })
  })

  it('guitar never keeps a bass string count', () => {
    expect(
      normalizePlayerPreferences({ ...DEFAULT_PREFERENCES, bassStringCount: 5 }).bassStringCount,
    ).toBeNull()
  })
})

describe('applyPreferencesUpdate', () => {
  it('switching to bass gives standard bass tuning and keeps everything else', () => {
    const start = { ...DEFAULT_PREFERENCES, handedness: 'left' as const, showIntervals: true }
    expect(applyPreferencesUpdate(start, { instrument: 'bass' })).toEqual({
      ...start,
      instrument: 'bass',
      guitarType: null,
      bassStringCount: 4,
      tuning: ['E', 'A', 'D', 'G'],
    })
  })

  it('switching back to guitar restores standard guitar tuning', () => {
    const bass = applyPreferencesUpdate(DEFAULT_PREFERENCES, { instrument: 'bass' })
    expect(applyPreferencesUpdate(bass, { instrument: 'guitar' })).toMatchObject({
      bassStringCount: null,
      tuning: standardTuning('guitar', 6),
    })
  })

  it('a new bass string count gets that count’s standard tuning', () => {
    const bass = applyPreferencesUpdate(DEFAULT_PREFERENCES, { instrument: 'bass' })
    expect(applyPreferencesUpdate(bass, { bassStringCount: 5 }).tuning).toEqual([
      'B',
      'E',
      'A',
      'D',
      'G',
    ])
    expect(applyPreferencesUpdate(bass, { bassStringCount: 6 }).tuning).toEqual(
      standardTuning('bass', 6),
    )
  })

  it('choosing finger numbers turns note names off', () => {
    expect(applyPreferencesUpdate(DEFAULT_PREFERENCES, { showFingerNumbers: true })).toMatchObject({
      showNoteNames: false,
      showFingerNumbers: true,
    })
  })

  it('an explicit tuning is kept when it fits', () => {
    const dropD = ['D', 'A', 'D', 'G', 'B', 'E']
    expect(applyPreferencesUpdate(DEFAULT_PREFERENCES, { tuning: dropD }).tuning).toEqual(dropD)
    expect(findTuningPreset('guitar', dropD)?.name).toBe('Drop D')
  })
})

describe('auto-progress', () => {
  it('is off by default, and normalizes out-of-range values', async () => {
    const { AUTO_PROGRESS_STEPS, formatAutoProgress, nearestAutoProgressStep } = await import(
      '../preferences'
    )
    expect(DEFAULT_PREFERENCES.autoProgressSeconds).toBe(0)
    expect(
      normalizePlayerPreferences({ ...DEFAULT_PREFERENCES, autoProgressSeconds: 2 })
        .autoProgressSeconds,
    ).toBe(0)
    expect(
      normalizePlayerPreferences({ ...DEFAULT_PREFERENCES, autoProgressSeconds: 45 })
        .autoProgressSeconds,
    ).toBe(30)
    expect(formatAutoProgress(0)).toBe('Off')
    expect(formatAutoProgress(10)).toBe('10s')
    // Finer at the fast end, where it matters.
    expect(AUTO_PROGRESS_STEPS.filter((step) => step > 0 && step <= 6)).toEqual([3, 4, 5, 6])
    expect(nearestAutoProgressStep(11)).toBe(10)
    expect(nearestAutoProgressStep(29)).toBe(30)
  })
})

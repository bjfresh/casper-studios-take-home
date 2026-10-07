import { describe, expect, it } from 'vitest'
import {
  applyItemResult,
  EMPTY_GUEST_PROGRESS,
  finishGroup,
  type GuestProgress,
} from '../progress-rules'

const G = 'first-chords'
const ITEMS = ['chord:g-major', 'chord:c-major']

const play = (progress: GuestProgress, key: string, result: 'got_it' | 'skipped', now: number) =>
  applyItemResult(progress, { groupSlug: G, key, result }, now)

describe('progress rules', () => {
  it('Got it: learns the item once, counts every play, touches the group', () => {
    let p = play(EMPTY_GUEST_PROGRESS, 'chord:g-major', 'got_it', 100)
    p = play(p, 'chord:g-major', 'got_it', 200)
    expect(p.items['chord:g-major']).toEqual({
      learnedAt: 100,
      lastPlayedAt: 200,
      lastSkippedAt: null,
      playCount: 2,
    })
    expect(p.groups[G]).toEqual({ completedAt: null, lastPlayedAt: 200, playCount: 0 })
  })

  it('Skip: records the skip only; not practice, not learned', () => {
    const p = play(EMPTY_GUEST_PROGRESS, 'chord:g-major', 'skipped', 100)
    expect(p.items['chord:g-major']).toEqual({
      learnedAt: null,
      lastPlayedAt: null,
      lastSkippedAt: 100,
      playCount: 0,
    })
    expect(p.groups[G]).toBeUndefined()
  })

  it('Finish with a skip: played, not completed', () => {
    let p = play(EMPTY_GUEST_PROGRESS, 'chord:g-major', 'got_it', 100)
    p = play(p, 'chord:c-major', 'skipped', 110)
    p = finishGroup(p, { groupSlug: G, itemKeys: ITEMS }, 120)
    expect(p.groups[G]).toEqual({ completedAt: null, lastPlayedAt: 120, playCount: 1 })
  })

  it('Finish once everything is learned (across sessions): completed, first time only', () => {
    let p = play(EMPTY_GUEST_PROGRESS, 'chord:g-major', 'got_it', 100)
    p = finishGroup(p, { groupSlug: G, itemKeys: ITEMS }, 110)
    p = play(p, 'chord:c-major', 'got_it', 200)
    p = finishGroup(p, { groupSlug: G, itemKeys: ITEMS }, 210)
    expect(p.groups[G]).toEqual({ completedAt: 210, lastPlayedAt: 210, playCount: 2 })

    p = finishGroup(p, { groupSlug: G, itemKeys: ITEMS }, 300)
    expect(p.groups[G]?.completedAt).toBe(210)
  })

  it('an empty lesson never counts as completed', () => {
    expect(
      finishGroup(EMPTY_GUEST_PROGRESS, { groupSlug: G, itemKeys: [] }, 1).groups[G]?.completedAt,
    ).toBeNull()
  })
})

import { createDatabase, eq, sql } from '@repo/db'
import { chordGroups, userChordGroupProgress, userChordProgress, users } from '@repo/db/schema'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { CURRICULUM } from '../../curriculum/curriculum-source'
import {
  getReviewCandidates,
  listCurriculum,
  listGroupProgress,
  recordGroupPractice,
} from '../curriculum-service'
import { syncCurriculum } from '../curriculum-sync-service'
import { upsertUserFromIdentity } from '../user-service'

// Integration tests against the real test database, which global-setup has
// migrated and synced with the real curriculum.
const { db, close } = createDatabase(undefined, { max: 4 })
const DID_PREFIX = 'did:privy:test-curriculum-'
let counter = 0
const DAY = 24 * 60 * 60 * 1000

async function newUser() {
  const { id } = await upsertUserFromIdentity(
    { privyUserId: `${DID_PREFIX}${Date.now()}-${counter++}`, email: null },
    db,
  )
  return id
}

let groupIds: Record<string, string>
let chordIds: Record<string, string>

beforeAll(async () => {
  const curriculum = await listCurriculum(await newUser(), 'guitar', db)
  groupIds = Object.fromEntries(curriculum.map((group) => [group.slug, group.id]))
  chordIds = Object.fromEntries(
    curriculum.flatMap((group) =>
      group.items.flatMap((item) =>
        item.type === 'chord' ? [[item.chord.slug, item.chord.id]] : [],
      ),
    ),
  )
})

afterEach(async () => {
  const ids = sql`(select id from users where privy_user_id like ${`${DID_PREFIX}%`})`
  await db.delete(userChordGroupProgress).where(sql`${userChordGroupProgress.userId} in ${ids}`)
  await db.delete(userChordProgress).where(sql`${userChordProgress.userId} in ${ids}`)
  await db.delete(users).where(sql`${users.privyUserId} like ${`${DID_PREFIX}%`}`)
})
afterAll(() => close())

/** Rewrites a progress row's timestamps, to test time-based queries without waiting. */
async function backdate(
  userId: string,
  slug: string,
  { completedDaysAgo, playedDaysAgo }: { completedDaysAgo?: number; playedDaysAgo: number },
) {
  const at = (days: number) => new Date(Date.now() - days * DAY)
  await db
    .update(userChordGroupProgress)
    .set({
      lastPlayedAt: at(playedDaysAgo),
      ...(completedDaysAgo === undefined ? {} : { completedAt: at(completedDaysAgo) }),
    })
    .where(
      sql`${userChordGroupProgress.userId} = ${userId} and ${userChordGroupProgress.groupId} = ${groupIds[slug]}`,
    )
}

describe('curriculum sync', () => {
  it('is idempotent: a second sync keeps every id', async () => {
    const before = await db.select({ id: chordGroups.id, slug: chordGroups.slug }).from(chordGroups)
    const summary = await syncCurriculum(undefined, db)
    const after = await db.select({ id: chordGroups.id, slug: chordGroups.slug }).from(chordGroups)

    expect(summary).toMatchObject({
      groups: 13,
      chords: CURRICULUM.chords.length,
      orphanedGroupSlugs: [],
    })
    expect(after.sort((a, b) => a.slug.localeCompare(b.slug))).toEqual(
      before.sort((a, b) => a.slug.localeCompare(b.slug)),
    )
  })

  it('reorders and renumbers lessons in one sync, keeping ids and progress', async () => {
    // Swapping two lessons swaps their sort_order and lesson_number between
    // rows: only possible because the unique constraints are deferred.
    const userId = await newUser()
    const firstChords = groupIds['first-chords'] ?? ''
    await recordGroupPractice(userId, { groupId: firstChords, completed: true, chordIds: [] }, db)

    const [one, two, ...rest] = CURRICULUM.groups
    if (!one || !two) throw new Error('curriculum too short')
    const swapped = {
      ...CURRICULUM,
      groups: [
        { ...two, lessonNumber: one.lessonNumber, sortOrder: one.sortOrder },
        { ...one, lessonNumber: two.lessonNumber, sortOrder: two.sortOrder },
        ...rest,
      ],
    }
    try {
      await syncCurriculum(swapped, db)
      const reordered = await listCurriculum(userId, 'guitar', db)
      expect(reordered.slice(0, 2).map((group) => [group.lessonNumber, group.slug])).toEqual([
        [1, 'first-minors'],
        [2, 'first-chords'],
      ])
      // Same row, same progress: renumbering never touches identity.
      const moved = reordered.find((group) => group.slug === 'first-chords')
      expect(moved?.id).toBe(firstChords)
      expect(moved?.progress?.completedAt).not.toBeNull()
    } finally {
      await syncCurriculum(undefined, db)
    }
  })

  it('rejects a source that gives two groups the same lesson number', async () => {
    const [one, two, ...rest] = CURRICULUM.groups
    if (!one || !two) throw new Error('curriculum too short')
    const clash = {
      ...CURRICULUM,
      groups: [one, { ...two, lessonNumber: one.lessonNumber }, ...rest],
    }
    await expect(syncCurriculum(clash, db)).rejects.toThrow()
    // The failed sync rolled back: lesson 2 is still First Minors.
    const curriculum = await listCurriculum(await newUser(), 'guitar', db)
    expect(curriculum[1]).toMatchObject({ lessonNumber: 2, slug: 'first-minors' })
  })

  it('refuses a source with impossible geometry before writing anything', async () => {
    const [shape, ...rest] = CURRICULUM.shapes
    if (!shape) throw new Error('no shapes')
    const bad = { ...CURRICULUM, shapes: [{ ...shape, rootString: 7 }, ...rest] }
    await expect(syncCurriculum(bad, db)).rejects.toThrow(
      /root string 7 doesn't exist on a 6-string instrument/,
    )
  })

  it('writes structured qualifiers, and keeps the deprecated columns populated for the old release', async () => {
    const rows = await db.execute<{
      slug: string
      title: string
      root_string: number | null
      inversion_index: number | null
      string_set_start: number | null
      string_set_end: number | null
      name: string
      inversion: string | null
    }>(sql`select slug, title, root_string, inversion_index, string_set_start, string_set_end, name, inversion
           from chord_shapes where slug in ('shell-maj7-root-6', 'triad-major-top-first') order by slug`)
    expect(rows.map((row) => ({ ...row }))).toEqual([
      {
        slug: 'shell-maj7-root-6',
        title: 'Major 7 Shell',
        root_string: 6,
        inversion_index: null,
        string_set_start: null,
        string_set_end: null,
        name: 'Major 7 Shell (6th-string root)',
        inversion: null,
      },
      {
        slug: 'triad-major-top-first',
        title: 'Major Triad',
        root_string: null,
        inversion_index: 1,
        string_set_start: 1,
        string_set_end: 3,
        name: 'Major Triad (1st inversion · Strings 1–3)',
        inversion: 'first',
      },
    ])
  })

  it('never deletes a group missing from the source; it reports it', async () => {
    await db.insert(chordGroups).values({
      slug: 'retired-test-group',
      name: 'Retired',
      description: 'x',
      sortOrder: 99,
      focus: 'chords',
    })
    try {
      const summary = await syncCurriculum(undefined, db)
      expect(summary.orphanedGroupSlugs).toEqual(['retired-test-group'])
    } finally {
      await db.delete(chordGroups).where(eq(chordGroups.slug, 'retired-test-group'))
    }
  })
})

describe('listCurriculum', () => {
  it('returns the 13 lessons ordered by sortOrder, with lesson numbers and ordered members', async () => {
    const curriculum = await listCurriculum(await newUser(), 'guitar', db)
    expect(curriculum.map((group) => [group.lessonNumber, group.sortOrder])).toEqual(
      Array.from({ length: 13 }, (_, index) => [index + 1, (index + 1) * 10]),
    )
    expect(curriculum[3]).toMatchObject({ lessonNumber: 4, name: 'The A Family' })
    expect(
      curriculum[0]?.items.map((item) => (item.type === 'chord' ? item.chord.name : '')),
    ).toEqual(['G', 'C', 'D'])
  })

  it('represents chords, shapes and practice-only groups', async () => {
    const curriculum = await listCurriculum(await newUser(), 'guitar', db)
    const bySlug = Object.fromEntries(curriculum.map((group) => [group.slug, group]))

    expect(bySlug['movable-major-and-minor']?.items.every((item) => item.type === 'shape')).toBe(
      true,
    )
    expect(
      bySlug['ii-v-i']?.items.map((item) => item.type === 'chord' && [item.chord.name, item.role]),
    ).toEqual([
      ['Dm7', 'practices'],
      ['G7', 'practices'],
      ['Cmaj7', 'practices'],
    ])
  })

  it('reuses one chord record across groups', async () => {
    const curriculum = await listCurriculum(await newUser(), 'guitar', db)
    const dm7Ids = curriculum.flatMap((group) =>
      group.items.flatMap((item) =>
        item.type === 'chord' && item.chord.slug === 'dm7' ? [item.chord.id] : [],
      ),
    )
    expect(dm7Ids).toHaveLength(2)
    expect(new Set(dm7Ids).size).toBe(1)
  })

  it('has no groups for bass yet', async () => {
    expect(await listCurriculum(await newUser(), 'bass', db)).toEqual([])
  })
})

describe('recordGroupPractice', () => {
  it('starts progress on first practice, then increments and moves lastPlayedAt', async () => {
    const userId = await newUser()
    const groupId = groupIds['first-chords'] ?? ''
    const first = await recordGroupPractice(userId, { groupId, completed: false, chordIds: [] }, db)
    expect(first).toMatchObject({ playCount: 1, completedAt: null })

    const second = await recordGroupPractice(
      userId,
      { groupId, completed: false, chordIds: [] },
      db,
    )
    expect(second.playCount).toBe(2)
    expect(second.lastPlayedAt?.getTime()).toBeGreaterThanOrEqual(
      first.lastPlayedAt?.getTime() ?? 0,
    )
  })

  it('keeps the FIRST completion: completing again never overwrites completedAt', async () => {
    const userId = await newUser()
    const groupId = groupIds['first-chords'] ?? ''
    const done = await recordGroupPractice(userId, { groupId, completed: true, chordIds: [] }, db)
    await new Promise((resolve) => setTimeout(resolve, 10))
    const again = await recordGroupPractice(userId, { groupId, completed: true, chordIds: [] }, db)
    const notCompleting = await recordGroupPractice(
      userId,
      { groupId, completed: false, chordIds: [] },
      db,
    )

    expect(again.completedAt).toEqual(done.completedAt)
    expect(notCompleting.completedAt).toEqual(done.completedAt)
    expect(notCompleting.playCount).toBe(3)
  })

  it('counts concurrent sessions correctly', async () => {
    const userId = await newUser()
    const groupId = groupIds['first-minors'] ?? ''
    await Promise.all(
      Array.from({ length: 5 }, () =>
        recordGroupPractice(userId, { groupId, completed: false, chordIds: [] }, db),
      ),
    )
    const [row] = await listGroupProgress(userId, {}, db).then((rows) =>
      rows.filter((r) => r.slug === 'first-minors'),
    )
    expect(row?.progress?.playCount).toBe(5)
  })

  it('tracks only the chords actually practiced', async () => {
    const userId = await newUser()
    const groupId = groupIds['first-chords'] ?? ''
    await recordGroupPractice(
      userId,
      { groupId, completed: false, chordIds: [chordIds['g-major'] ?? ''] },
      db,
    )

    const rows = await db
      .select()
      .from(userChordProgress)
      .where(eq(userChordProgress.userId, userId))
    expect(rows.map((row) => row.chordId)).toEqual([chordIds['g-major']])
    expect(rows[0]).toMatchObject({ playCount: 1, learnedAt: null })
  })

  it('rejects chords that are not in the group, and records nothing', async () => {
    const userId = await newUser()
    await expect(
      recordGroupPractice(
        userId,
        {
          groupId: groupIds['first-chords'] ?? '',
          completed: false,
          chordIds: [chordIds['f-major'] ?? ''],
        },
        db,
      ),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' })
    expect(await listGroupProgress(userId, { completed: true }, db)).toEqual([])
    expect((await listGroupProgress(userId, {}, db)).every((row) => row.progress === null)).toBe(
      true,
    )
  })

  it('NOT_FOUND for an unknown group', async () => {
    await expect(
      recordGroupPractice(
        await newUser(),
        { groupId: '00000000-0000-4000-8000-000000000000', completed: false, chordIds: [] },
        db,
      ),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})

describe('progress queries', () => {
  async function userWithHistory() {
    const userId = await newUser()
    const practice = (slug: string, completed: boolean) =>
      recordGroupPractice(userId, { groupId: groupIds[slug] ?? '', completed, chordIds: [] }, db)
    await practice('first-chords', true)
    await practice('first-minors', true)
    await practice('the-c-family', false)
    await backdate(userId, 'first-chords', { completedDaysAgo: 40, playedDaysAgo: 30 })
    await backdate(userId, 'first-minors', { completedDaysAgo: 2, playedDaysAgo: 1 })
    await backdate(userId, 'the-c-family', { playedDaysAgo: 10 })
    return userId
  }

  it('lists completed and never-completed groups', async () => {
    const userId = await userWithHistory()
    const completed = await listGroupProgress(userId, { completed: true }, db)
    const notCompleted = await listGroupProgress(userId, { completed: false }, db)
    expect(completed.map((row) => row.slug)).toEqual(['first-chords', 'first-minors'])
    expect(notCompleted).toHaveLength(11)
    expect(notCompleted[0]?.slug).toBe('the-c-family')
  })

  it('orders by least recently practiced, never-practiced last', async () => {
    const userId = await userWithHistory()
    const rows = await listGroupProgress(userId, { orderBy: 'least-recently-practiced' }, db)
    expect(rows.slice(0, 3).map((row) => row.slug)).toEqual([
      'first-chords',
      'the-c-family',
      'first-minors',
    ])
    expect(rows.at(-1)?.progress).toBeNull()
  })

  it('finds groups not practiced within an interval', async () => {
    const userId = await userWithHistory()
    const since = new Date(Date.now() - 7 * DAY)
    const stale = await listGroupProgress(userId, { notPracticedSince: since }, db)
    expect(stale.map((row) => row.slug)).toEqual(['first-chords', 'the-c-family'])

    const withUnstarted = await listGroupProgress(
      userId,
      { notPracticedSince: since, includeNeverPracticed: true },
      db,
    )
    expect(withUnstarted).toHaveLength(12)
  })

  it('suggests completed groups due for review, most overdue first', async () => {
    const userId = await userWithHistory()
    // first-chords: learned 40 days ago → 20-day interval, last played 30 days
    // ago → due. first-minors: learned 2 days ago → 2-day interval, played
    // yesterday → not due. the-c-family isn't completed → never a candidate.
    const due = await getReviewCandidates(userId, {}, db)
    expect(due.map((candidate) => [candidate.slug, candidate.intervalDays])).toEqual([
      ['first-chords', 20],
    ])

    const later = await getReviewCandidates(userId, { now: new Date(Date.now() + 3 * DAY) }, db)
    expect(later.map((candidate) => candidate.slug)).toEqual(['first-chords', 'first-minors'])
  })

  it('progress is per user: another user sees none of it', async () => {
    await userWithHistory()
    const stranger = await newUser()
    expect((await listGroupProgress(stranger, {}, db)).every((row) => row.progress === null)).toBe(
      true,
    )
  })
})

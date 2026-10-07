import { createDatabase, eq, sql } from '@repo/db'
import {
  userChordGroupProgress,
  userChordProgress,
  userChordShapeProgress,
  users,
} from '@repo/db/schema'
import type { LessonContent } from '@repo/shared'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import {
  finishLesson,
  getLesson,
  getLessonProgress,
  importGuestProgress,
  listLessons,
  recordItemResult,
} from '../lesson-service'
import { upsertUserFromIdentity } from '../user-service'

// Integration tests against the real (migrated, synced) test database.
const { db, close } = createDatabase(undefined, { max: 4 })
const DID_PREFIX = 'did:privy:test-lessons-'
let counter = 0

async function newUser() {
  const { id } = await upsertUserFromIdentity(
    { privyUserId: `${DID_PREFIX}${Date.now()}-${counter++}`, email: null },
    db,
  )
  return id
}

let lessons: LessonContent[]
const lesson = (slug: string) => {
  const found = lessons.find((candidate) => candidate.slug === slug)
  if (!found) throw new Error(`no lesson ${slug}`)
  return found
}

beforeAll(async () => {
  lessons = await listLessons('guitar', db)
})

afterEach(async () => {
  const ids = sql`(select id from users where privy_user_id like ${`${DID_PREFIX}%`})`
  await db.delete(userChordGroupProgress).where(sql`${userChordGroupProgress.userId} in ${ids}`)
  await db.delete(userChordProgress).where(sql`${userChordProgress.userId} in ${ids}`)
  await db.delete(userChordShapeProgress).where(sql`${userChordShapeProgress.userId} in ${ids}`)
  await db.delete(users).where(sql`${users.privyUserId} like ${`${DID_PREFIX}%`}`)
})
afterAll(() => close())

describe('lesson content (public)', () => {
  it('lists lessons by sortOrder with items in membership order and diagrams', () => {
    expect(lessons.map((l) => l.sortOrder)).toEqual(
      lessons.map((l) => l.sortOrder).sort((a, b) => a - b),
    )
    const first = lesson('first-chords')
    expect(first).toMatchObject({ lessonNumber: 1, name: 'First Chords' })
    expect(first.items.map((item) => item.title)).toEqual(['G', 'C', 'D'])
    expect(first.items[0]?.tuning).toEqual(['E', 'A', 'D', 'G', 'B', 'E'])
    expect(first.items[1]?.diagram?.mutedStrings).toEqual([6])
  })

  it('gives every item a diagram (chords from voicings, shapes from their example)', () => {
    const missing = lessons.flatMap((l) =>
      l.items.filter((item) => !item.diagram).map((item) => `${l.slug}/${item.slug}`),
    )
    expect(missing).toEqual([])
    expect(lesson('movable-major-and-minor').items[0]?.diagram?.exampleName).toBe('A')
  })

  it('carries structured qualifiers, not combined names', () => {
    const shell = lesson('shell-chords').items[0]
    expect(shell).toMatchObject({
      title: 'Major 7 Shell',
      subtitle: null,
      rootString: 6,
      inversion: null,
    })

    const triad = lesson('small-chords').items[1]
    expect(triad).toMatchObject({
      title: 'Major Triad',
      inversion: 1,
      stringSetStart: 1,
      stringSetEnd: 3,
      rootString: null,
    })

    // A chord's qualifiers come from its default voicing: open C is a 5th-string root, in root position.
    const c = lesson('first-chords').items[1]
    expect(c).toMatchObject({ title: 'C', rootString: 5, inversion: 0 })
  })

  it('labels every note with its interval from the chord root', () => {
    const c = lesson('first-chords').items[1]
    // x32010: C E G C E
    expect(c?.diagram?.positions.map((position) => position.interval)).toEqual([
      '1',
      '3',
      '5',
      '1',
      '3',
    ])
    const dom9 = lesson('jazz-colors').items[3]
    // C9 (x3233x): C E B♭ D
    expect(dom9?.diagram?.positions.map((position) => position.interval)).toEqual([
      '1',
      '3',
      'b7',
      '9',
    ])
  })

  it('gets one lesson by slug, and NOT_FOUND for an unknown one', async () => {
    expect((await getLesson('the-a-family', db)).items.map((item) => item.title)).toEqual([
      'A',
      'E7',
    ])
    await expect(getLesson('no-such-lesson', db)).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})

describe('Got it / Skip / finish', () => {
  const firstChords = () => lesson('first-chords')
  const item = (index: number) => {
    const found = firstChords().items[index]
    if (!found) throw new Error('no item')
    return { type: found.type, id: found.id }
  }

  async function chordRow(userId: string, chordId: string) {
    const [row] = await db
      .select()
      .from(userChordProgress)
      .where(
        sql`${userChordProgress.userId} = ${userId} and ${userChordProgress.chordId} = ${chordId}`,
      )
    return row
  }

  it('Got it learns the item (first time only), counts it, and touches the lesson', async () => {
    const userId = await newUser()
    const groupId = firstChords().id
    await recordItemResult(userId, { groupId, item: item(0), result: 'got_it' }, db)
    const first = await chordRow(userId, item(0).id)
    await recordItemResult(userId, { groupId, item: item(0), result: 'got_it' }, db)
    const second = await chordRow(userId, item(0).id)

    expect(second).toMatchObject({ playCount: 2, lastSkippedAt: null })
    expect(second?.learnedAt).toEqual(first?.learnedAt)
    const [progress] = await getLessonProgress(userId, 'guitar', db)
    expect(progress).toMatchObject({ slug: 'first-chords', playCount: 0, completedAt: null })
    expect(progress?.lastPlayedAt).not.toBeNull()
  })

  it('Skip records the skip only: not learned, not practice', async () => {
    const userId = await newUser()
    await recordItemResult(
      userId,
      { groupId: firstChords().id, item: item(1), result: 'skipped' },
      db,
    )
    expect(await chordRow(userId, item(1).id)).toMatchObject({
      learnedAt: null,
      lastPlayedAt: null,
      playCount: 0,
    })
    expect((await chordRow(userId, item(1).id))?.lastSkippedAt).not.toBeNull()
    expect(await getLessonProgress(userId, 'guitar', db)).toEqual([])
  })

  it('finish with a skip: played, not completed; finish once all learned: completed, first time only', async () => {
    const userId = await newUser()
    const groupId = firstChords().id
    await recordItemResult(userId, { groupId, item: item(0), result: 'got_it' }, db)
    await recordItemResult(userId, { groupId, item: item(1), result: 'skipped' }, db)
    await recordItemResult(userId, { groupId, item: item(2), result: 'got_it' }, db)
    expect(await finishLesson(userId, groupId, db)).toMatchObject({
      playCount: 1,
      completedAt: null,
    })

    await recordItemResult(userId, { groupId, item: item(1), result: 'got_it' }, db)
    const completed = await finishLesson(userId, groupId, db)
    expect(completed.playCount).toBe(2)
    expect(completed.completedAt).not.toBeNull()

    const again = await finishLesson(userId, groupId, db)
    expect(again.completedAt).toEqual(completed.completedAt)
    expect(again.playCount).toBe(3)
  })

  it('records shape lessons in shape progress', async () => {
    const userId = await newUser()
    const shapes = lesson('movable-major-and-minor')
    const shape = shapes.items[0]
    if (!shape) throw new Error('no shape')
    await recordItemResult(
      userId,
      { groupId: shapes.id, item: { type: 'shape', id: shape.id }, result: 'got_it' },
      db,
    )
    const rows = await db
      .select()
      .from(userChordShapeProgress)
      .where(eq(userChordShapeProgress.userId, userId))
    expect(rows).toHaveLength(1)
    expect(rows[0]?.shapeId).toBe(shape.id)
  })

  it('rejects an item that is not part of the lesson', async () => {
    const userId = await newUser()
    const f = lesson('the-missing-chords').items[0]
    if (!f) throw new Error('no item')
    await expect(
      recordItemResult(
        userId,
        { groupId: firstChords().id, item: { type: 'chord', id: f.id }, result: 'got_it' },
        db,
      ),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' })
  })
})

describe('importGuestProgress', () => {
  const NOW = Date.now()

  it('maps slugs to ids and merges: earliest completion, latest play, summed counts', async () => {
    const userId = await newUser()
    const groupId = lesson('first-chords').id
    // Some account progress first.
    await recordItemResult(
      userId,
      {
        groupId,
        item: { type: 'chord', id: lesson('first-chords').items[0]?.id ?? '' },
        result: 'got_it',
      },
      db,
    )
    await finishLesson(userId, groupId, db)

    const result = await importGuestProgress(
      userId,
      {
        version: 1,
        groups: {
          'first-chords': { completedAt: NOW - 10_000, lastPlayedAt: NOW - 5_000, playCount: 3 },
          'retired-lesson': { completedAt: null, lastPlayedAt: NOW, playCount: 1 },
        },
        items: {
          'chord:g-major': {
            learnedAt: NOW - 60_000,
            lastPlayedAt: NOW - 50_000,
            lastSkippedAt: null,
            playCount: 2,
          },
          'shape:e-shape-major': {
            learnedAt: null,
            lastPlayedAt: null,
            lastSkippedAt: NOW - 1_000,
            playCount: 0,
          },
        },
      },
      db,
    )
    expect(result).toEqual({ groups: 1, items: 2 })

    const [progress] = await getLessonProgress(userId, 'guitar', db)
    expect(progress?.playCount).toBe(4)
    expect(progress?.completedAt?.getTime()).toBe(NOW - 10_000)
    const [g] = await db
      .select()
      .from(userChordProgress)
      .where(eq(userChordProgress.userId, userId))
    expect(g?.playCount).toBe(3)
    expect(g?.learnedAt?.getTime()).toBe(NOW - 60_000)
  })

  it('never takes a timestamp from the future', async () => {
    const userId = await newUser()
    await importGuestProgress(
      userId,
      {
        version: 1,
        groups: {
          'first-chords': { completedAt: null, lastPlayedAt: NOW + 10 * 86_400_000, playCount: 1 },
        },
        items: {},
      },
      db,
    )
    const [progress] = await getLessonProgress(userId, 'guitar', db)
    expect(progress?.lastPlayedAt?.getTime()).toBeLessThanOrEqual(Date.now())
  })
})

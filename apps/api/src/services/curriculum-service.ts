import {
  and,
  asc,
  type Database,
  eq,
  getDb,
  inArray,
  isNotNull,
  isNull,
  lt,
  or,
  type SQL,
  sql,
} from '@repo/db'
import {
  chordGroupChords,
  chordGroupShapes,
  chordGroups,
  chordShapes,
  chords,
  userChordGroupProgress,
  userChordProgress,
} from '@repo/db/schema'
import {
  type ChordGroupItem,
  type ChordGroupProgress,
  type CurriculumGroup,
  type Instrument,
  type RecordPracticeInput,
  type ReviewCandidate,
  type ReviewPolicy,
  reviewDueAt,
} from '@repo/shared'
import { AppError } from '../utils/app-error'

/*
 * Every function takes the caller's LOCAL user id from the auth context and
 * reads or writes only that user's progress. Curriculum rows are shared and
 * read-only here.
 */

const progressColumns = {
  completedAt: userChordGroupProgress.completedAt,
  lastPlayedAt: userChordGroupProgress.lastPlayedAt,
  playCount: userChordGroupProgress.playCount,
}

const groupSummaryColumns = {
  id: chordGroups.id,
  slug: chordGroups.slug,
  name: chordGroups.name,
  description: chordGroups.description,
  lessonNumber: chordGroups.lessonNumber,
  sortOrder: chordGroups.sortOrder,
  focus: chordGroups.focus,
  instrument: chordGroups.instrument,
}

/** Left join: a group the user has never practiced has null progress columns. */
function toProgress(row: {
  completedAt: Date | null
  lastPlayedAt: Date | null
  playCount: number | null
}): ChordGroupProgress | null {
  return row.playCount === null
    ? null
    : { completedAt: row.completedAt, lastPlayedAt: row.lastPlayedAt, playCount: row.playCount }
}

/** The curriculum in order, each group with its members and this user's progress. */
export async function listCurriculum(
  userId: string,
  instrument: Instrument = 'guitar',
  db: Database = getDb(),
): Promise<CurriculumGroup[]> {
  const groups = await db
    .select({ ...groupSummaryColumns, ...progressColumns })
    .from(chordGroups)
    .leftJoin(
      userChordGroupProgress,
      and(
        eq(userChordGroupProgress.groupId, chordGroups.id),
        eq(userChordGroupProgress.userId, userId),
      ),
    )
    .where(eq(chordGroups.instrument, instrument))
    // sortOrder, never lessonNumber: unnumbered review/bonus groups have a
    // position too. Unique per instrument, so the order is total.
    .orderBy(asc(chordGroups.sortOrder))

  if (groups.length === 0) return []
  const groupIds = groups.map((group) => group.id)

  const [chordMembers, shapeMembers] = await Promise.all([
    db
      .select({
        groupId: chordGroupChords.groupId,
        sortOrder: chordGroupChords.sortOrder,
        role: chordGroupChords.role,
        chord: {
          id: chords.id,
          slug: chords.slug,
          name: chords.name,
          root: chords.root,
          quality: chords.quality,
        },
      })
      .from(chordGroupChords)
      .innerJoin(chords, eq(chords.id, chordGroupChords.chordId))
      .where(inArray(chordGroupChords.groupId, groupIds)),
    db
      .select({
        groupId: chordGroupShapes.groupId,
        sortOrder: chordGroupShapes.sortOrder,
        role: chordGroupShapes.role,
        shape: {
          id: chordShapes.id,
          slug: chordShapes.slug,
          title: chordShapes.title,
          subtitle: chordShapes.subtitle,
          quality: chordShapes.quality,
          shapeType: chordShapes.kind,
          instrument: chordShapes.instrument,
          rootString: chordShapes.rootString,
          inversion: chordShapes.inversion,
          stringSetStart: chordShapes.stringSetStart,
          stringSetEnd: chordShapes.stringSetEnd,
          strings: chordShapes.strings,
          description: chordShapes.description,
        },
      })
      .from(chordGroupShapes)
      .innerJoin(chordShapes, eq(chordShapes.id, chordGroupShapes.shapeId))
      .where(inArray(chordGroupShapes.groupId, groupIds)),
  ])

  const itemsByGroup = new Map<string, Array<{ sortOrder: number; item: ChordGroupItem }>>()
  const add = (groupId: string, sortOrder: number, item: ChordGroupItem) => {
    const list = itemsByGroup.get(groupId) ?? []
    list.push({ sortOrder, item })
    itemsByGroup.set(groupId, list)
  }
  for (const { groupId, sortOrder, role, chord } of chordMembers) {
    add(groupId, sortOrder, { type: 'chord', role, chord })
  }
  for (const { groupId, sortOrder, role, shape } of shapeMembers) {
    add(groupId, sortOrder, { type: 'shape', role, shape })
  }

  return groups.map(({ completedAt, lastPlayedAt, playCount, ...group }) => ({
    ...group,
    items: (itemsByGroup.get(group.id) ?? [])
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(({ item }) => item),
    progress: toProgress({ completedAt, lastPlayedAt, playCount }),
  }))
}

export type GroupProgressRow = {
  groupId: string
  slug: string
  name: string
  lessonNumber: number | null
  sortOrder: number
  progress: ChordGroupProgress | null
}

export type GroupProgressQuery = {
  instrument?: Instrument
  /** true: completed only. false: never completed (including never practiced). */
  completed?: boolean
  /**
   * Only groups not practiced since this moment. Never-practiced groups are
   * included only with `includeNeverPracticed` — "not practiced lately" and
   * "not started" usually mean different things to the caller.
   */
  notPracticedSince?: Date
  includeNeverPracticed?: boolean
  /** 'curriculum' (default) or 'least-recently-practiced' (never-practiced last). */
  orderBy?: 'curriculum' | 'least-recently-practiced'
}

/**
 * The progress queries the app needs, as one composable function:
 * never-completed, completed, curriculum order, least recently practiced, and
 * not practiced within an interval.
 */
export async function listGroupProgress(
  userId: string,
  query: GroupProgressQuery = {},
  db: Database = getDb(),
): Promise<GroupProgressRow[]> {
  const {
    instrument = 'guitar',
    completed,
    notPracticedSince,
    includeNeverPracticed = false,
  } = query
  const progress = userChordGroupProgress
  // Typed operators, not raw sql``: they bind the Date through the column's
  // mapping, which a raw template parameter skips.
  const conditions: Array<SQL | undefined> = [eq(chordGroups.instrument, instrument)]

  if (completed === true) conditions.push(isNotNull(progress.completedAt))
  if (completed === false) conditions.push(isNull(progress.completedAt))
  if (notPracticedSince) {
    const stale = lt(progress.lastPlayedAt, notPracticedSince)
    conditions.push(includeNeverPracticed ? or(isNull(progress.lastPlayedAt), stale) : stale)
  }

  const order =
    query.orderBy === 'least-recently-practiced'
      ? [sql`${progress.lastPlayedAt} asc nulls last`, asc(chordGroups.sortOrder)]
      : [asc(chordGroups.sortOrder)]

  const rows = await db
    .select({
      groupId: chordGroups.id,
      slug: chordGroups.slug,
      name: chordGroups.name,
      lessonNumber: chordGroups.lessonNumber,
      sortOrder: chordGroups.sortOrder,
      ...progressColumns,
    })
    .from(chordGroups)
    .leftJoin(progress, and(eq(progress.groupId, chordGroups.id), eq(progress.userId, userId)))
    .where(and(...conditions))
    .orderBy(...order)

  return rows.map(({ completedAt, lastPlayedAt, playCount, ...group }) => ({
    ...group,
    progress: toProgress({ completedAt, lastPlayedAt, playCount }),
  }))
}

/**
 * Records one qualifying practice session of a group (what "qualifying" means
 * is the client's call; this records it). Atomic upserts, so concurrent
 * sessions both count:
 * - play_count + 1 and last_played_at = now, every time
 * - completed_at set on the FIRST completion only, never overwritten
 * - per-chord progress only for the chords actually practiced
 */
export async function recordGroupPractice(
  userId: string,
  { groupId, completed, chordIds }: RecordPracticeInput,
  db: Database = getDb(),
): Promise<ChordGroupProgress> {
  return db.transaction(async (tx) => {
    const [group] = await tx
      .select({ id: chordGroups.id })
      .from(chordGroups)
      .where(eq(chordGroups.id, groupId))
    if (!group) throw new AppError('NOT_FOUND', 'Chord group not found')

    const uniqueChordIds = [...new Set(chordIds)]
    if (uniqueChordIds.length) {
      const members = await tx
        .select({ chordId: chordGroupChords.chordId })
        .from(chordGroupChords)
        .where(
          and(
            eq(chordGroupChords.groupId, groupId),
            inArray(chordGroupChords.chordId, uniqueChordIds),
          ),
        )
      const memberIds = new Set(members.map((member) => member.chordId))
      const strangers = uniqueChordIds.filter((id) => !memberIds.has(id))
      if (strangers.length) {
        throw new AppError('VALIDATION_FAILED', 'Some chords are not part of this group', {
          issues: strangers.map(() => ({ path: 'chordIds', message: 'Not in this group' })),
        })
      }
    }

    const now = new Date()
    const completedAt = completed ? now : null

    const [saved] = await tx
      .insert(userChordGroupProgress)
      .values({ userId, groupId, completedAt, lastPlayedAt: now, playCount: 1 })
      .onConflictDoUpdate({
        target: [userChordGroupProgress.userId, userChordGroupProgress.groupId],
        set: {
          // coalesce keeps the FIRST completion: a later completion (or a
          // non-completing session) can never move or clear it.
          completedAt: sql`coalesce(${userChordGroupProgress.completedAt}, excluded.completed_at)`,
          lastPlayedAt: sql`excluded.last_played_at`,
          // Increment in SQL, not read-modify-write, so concurrent sessions both count.
          playCount: sql`${userChordGroupProgress.playCount} + 1`,
          updatedAt: sql`now()`,
        },
      })
      .returning(progressColumns)

    if (uniqueChordIds.length) {
      await tx
        .insert(userChordProgress)
        .values(
          uniqueChordIds.map((chordId) => ({
            userId,
            chordId,
            learnedAt: completedAt,
            lastPlayedAt: now,
            playCount: 1,
          })),
        )
        .onConflictDoUpdate({
          target: [userChordProgress.userId, userChordProgress.chordId],
          set: {
            learnedAt: sql`coalesce(${userChordProgress.learnedAt}, excluded.learned_at)`,
            lastPlayedAt: sql`excluded.last_played_at`,
            playCount: sql`${userChordProgress.playCount} + 1`,
            updatedAt: sql`now()`,
          },
        })
    }

    if (!saved) throw new Error('Progress upsert returned no row')
    return saved
  })
}

/**
 * Completed groups that are due for review under `policy`, most overdue first.
 * The policy is a parameter (default: the simple placeholder in @repo/shared),
 * so a real spaced-repetition algorithm can replace it without a schema change.
 */
export async function getReviewCandidates(
  userId: string,
  {
    instrument = 'guitar',
    now = new Date(),
    policy,
  }: { instrument?: Instrument; now?: Date; policy?: ReviewPolicy } = {},
  db: Database = getDb(),
): Promise<ReviewCandidate[]> {
  const completed = await listGroupProgress(userId, { instrument, completed: true }, db)
  return completed
    .flatMap(({ groupId, slug, name, lessonNumber, sortOrder, progress }) => {
      if (!progress) return []
      const due = reviewDueAt(progress, now, policy)
      return due && due.dueAt <= now
        ? [{ groupId, slug, name, lessonNumber, sortOrder, progress, ...due }]
        : []
    })
    .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime() || a.sortOrder - b.sortOrder)
}

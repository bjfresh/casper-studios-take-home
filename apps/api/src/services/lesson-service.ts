import { and, asc, type Database, eq, getDb, inArray, sql } from '@repo/db'
import {
  chordGroupChords,
  chordGroupShapes,
  chordGroups,
  chordShapes,
  chords,
  chordVoicings,
  userChordGroupProgress,
  userChordProgress,
  userChordShapeProgress,
} from '@repo/db/schema'
import {
  type ChordDiagramData,
  chordDiagramSchema,
  formatValidationIssues,
  type GuestProgress,
  type Instrument,
  type LessonContent,
  type LessonItem,
  type LessonProgress,
  type RecordItemInput,
  toValidationIssues,
} from '@repo/shared'
import { STANDARD_TUNINGS } from '../curriculum/tunings'
import { AppError } from '../utils/app-error'

/*
 * Lessons: public content (no user data), plus the signed-in progress rules.
 * The rules mirror packages/shared/src/curriculum/progress-rules.ts, which
 * guests apply in the browser. Change both together.
 */

const groupColumns = {
  id: chordGroups.id,
  slug: chordGroups.slug,
  name: chordGroups.name,
  description: chordGroups.description,
  lessonNumber: chordGroups.lessonNumber,
  sortOrder: chordGroups.sortOrder,
  focus: chordGroups.focus,
  instrument: chordGroups.instrument,
}

/** Stored diagrams are JSON: validate on the way out like any persisted data. */
function parseDiagram(raw: unknown, label: string): ChordDiagramData | null {
  if (raw === null || raw === undefined) return null
  const result = chordDiagramSchema.safeParse(raw)
  if (!result.success) {
    console.error(
      `[lessons] invalid diagram for ${label}:`,
      formatValidationIssues(toValidationIssues(result.error)),
    )
    return null
  }
  return result.data
}

async function itemsFor(groups: Array<{ id: string; instrument: Instrument }>, db: Database) {
  const groupIds = groups.map((group) => group.id)
  const instrumentOf = new Map(groups.map((group) => [group.id, group.instrument]))
  if (groupIds.length === 0) return new Map<string, LessonItem[]>()

  const [chordMembers, shapeMembers] = await Promise.all([
    db
      .select({
        groupId: chordGroupChords.groupId,
        sortOrder: chordGroupChords.sortOrder,
        role: chordGroupChords.role,
        id: chords.id,
        slug: chords.slug,
        title: chords.name,
        diagram: chordVoicings.diagram,
        tuning: chordVoicings.tuning,
        // A chord's qualifiers are its default voicing's (open C: 5th-string root).
        rootString: chordVoicings.rootString,
        inversion: chordVoicings.inversion,
        stringSetStart: chordVoicings.stringSetStart,
        stringSetEnd: chordVoicings.stringSetEnd,
      })
      .from(chordGroupChords)
      .innerJoin(chords, eq(chords.id, chordGroupChords.chordId))
      .innerJoin(chordGroups, eq(chordGroups.id, chordGroupChords.groupId))
      // The default voicing for the LESSON's instrument; none → no diagram.
      .leftJoin(
        chordVoicings,
        and(
          eq(chordVoicings.chordId, chords.id),
          eq(chordVoicings.instrument, chordGroups.instrument),
          eq(chordVoicings.isDefault, true),
        ),
      )
      .where(inArray(chordGroupChords.groupId, groupIds)),
    db
      .select({
        groupId: chordGroupShapes.groupId,
        sortOrder: chordGroupShapes.sortOrder,
        role: chordGroupShapes.role,
        id: chordShapes.id,
        slug: chordShapes.slug,
        title: chordShapes.title,
        subtitle: chordShapes.subtitle,
        diagram: chordShapes.diagram,
        rootString: chordShapes.rootString,
        inversion: chordShapes.inversion,
        stringSetStart: chordShapes.stringSetStart,
        stringSetEnd: chordShapes.stringSetEnd,
      })
      .from(chordGroupShapes)
      .innerJoin(chordShapes, eq(chordShapes.id, chordGroupShapes.shapeId))
      .where(inArray(chordGroupShapes.groupId, groupIds)),
  ])

  const byGroup = new Map<string, Array<{ sortOrder: number; item: LessonItem }>>()
  const add = (groupId: string, sortOrder: number, item: LessonItem) => {
    byGroup.set(groupId, [...(byGroup.get(groupId) ?? []), { sortOrder, item }])
  }
  const standardTuning = (groupId: string) => [
    ...STANDARD_TUNINGS[instrumentOf.get(groupId) ?? 'guitar'],
  ]

  for (const member of chordMembers) {
    add(member.groupId, member.sortOrder, {
      type: 'chord',
      id: member.id,
      slug: member.slug,
      title: member.title,
      subtitle: null,
      rootString: member.rootString,
      inversion: member.inversion,
      stringSetStart: member.stringSetStart,
      stringSetEnd: member.stringSetEnd,
      role: member.role,
      diagram: parseDiagram(member.diagram, `chord ${member.slug}`),
      tuning: member.tuning ?? standardTuning(member.groupId),
    })
  }
  for (const member of shapeMembers) {
    add(member.groupId, member.sortOrder, {
      type: 'shape',
      id: member.id,
      slug: member.slug,
      title: member.title,
      subtitle: member.subtitle,
      rootString: member.rootString,
      inversion: member.inversion,
      stringSetStart: member.stringSetStart,
      stringSetEnd: member.stringSetEnd,
      role: member.role,
      diagram: parseDiagram(member.diagram, `shape ${member.slug}`),
      tuning: standardTuning(member.groupId),
    })
  }

  // Membership sortOrder, never insertion order.
  return new Map(
    [...byGroup].map(([groupId, entries]) => [
      groupId,
      entries.sort((a, b) => a.sortOrder - b.sortOrder).map(({ item }) => item),
    ]),
  )
}

/** Every lesson for an instrument, ordered by sortOrder, with items and diagrams. Public. */
export async function listLessons(
  instrument: Instrument = 'guitar',
  db: Database = getDb(),
): Promise<LessonContent[]> {
  const groups = await db
    .select(groupColumns)
    .from(chordGroups)
    .where(eq(chordGroups.instrument, instrument))
    .orderBy(asc(chordGroups.sortOrder))
  const items = await itemsFor(groups, db)
  return groups.map((group) => ({ ...group, items: items.get(group.id) ?? [] }))
}

/** One lesson by its stable slug. Public. */
export async function getLesson(slug: string, db: Database = getDb()): Promise<LessonContent> {
  const [group] = await db.select(groupColumns).from(chordGroups).where(eq(chordGroups.slug, slug))
  if (!group) throw new AppError('NOT_FOUND', 'Lesson not found')
  const items = await itemsFor([group], db)
  return { ...group, items: items.get(group.id) ?? [] }
}

/** The caller's progress on every lesson they've touched, for one instrument. */
export async function getLessonProgress(
  userId: string,
  instrument: Instrument = 'guitar',
  db: Database = getDb(),
): Promise<LessonProgress[]> {
  return db
    .select({
      slug: chordGroups.slug,
      completedAt: userChordGroupProgress.completedAt,
      lastPlayedAt: userChordGroupProgress.lastPlayedAt,
      playCount: userChordGroupProgress.playCount,
    })
    .from(userChordGroupProgress)
    .innerJoin(chordGroups, eq(chordGroups.id, userChordGroupProgress.groupId))
    .where(and(eq(userChordGroupProgress.userId, userId), eq(chordGroups.instrument, instrument)))
    .orderBy(asc(chordGroups.sortOrder))
}

async function requireGroup(groupId: string, db: Database) {
  const [group] = await db
    .select({ id: chordGroups.id, slug: chordGroups.slug })
    .from(chordGroups)
    .where(eq(chordGroups.id, groupId))
  if (!group) throw new AppError('NOT_FOUND', 'Lesson not found')
  return group
}

/**
 * One Got it / Skip. The item must belong to the lesson: progress can't be
 * recorded against an arbitrary chord through someone else's lesson.
 */
export async function recordItemResult(
  userId: string,
  { groupId, item, result }: RecordItemInput,
  db: Database = getDb(),
): Promise<void> {
  await db.transaction(async (tx) => {
    await requireGroup(groupId, tx)

    const membership =
      item.type === 'chord'
        ? tx
            .select({ id: chordGroupChords.chordId })
            .from(chordGroupChords)
            .where(
              and(eq(chordGroupChords.groupId, groupId), eq(chordGroupChords.chordId, item.id)),
            )
        : tx
            .select({ id: chordGroupShapes.shapeId })
            .from(chordGroupShapes)
            .where(
              and(eq(chordGroupShapes.groupId, groupId), eq(chordGroupShapes.shapeId, item.id)),
            )
    if ((await membership).length === 0) {
      throw new AppError('VALIDATION_FAILED', 'That item is not part of this lesson', {
        issues: [{ path: 'item.id', message: 'Not in this lesson' }],
      })
    }

    const now = new Date()
    const table = item.type === 'chord' ? userChordProgress : userChordShapeProgress
    const target =
      item.type === 'chord'
        ? [userChordProgress.userId, userChordProgress.chordId]
        : [userChordShapeProgress.userId, userChordShapeProgress.shapeId]
    const key = item.type === 'chord' ? { chordId: item.id } : { shapeId: item.id }

    if (result === 'skipped') {
      // A skip isn't practice: record it, touch nothing else.
      await tx
        .insert(table)
        .values({ userId, ...key, lastSkippedAt: now } as typeof table.$inferInsert)
        .onConflictDoUpdate({ target, set: { lastSkippedAt: now, updatedAt: sql`now()` } })
      return
    }

    await tx
      .insert(table)
      .values({
        userId,
        ...key,
        learnedAt: now,
        lastPlayedAt: now,
        playCount: 1,
      } as typeof table.$inferInsert)
      .onConflictDoUpdate({
        target,
        set: {
          learnedAt: sql`coalesce(${table.learnedAt}, excluded.learned_at)`,
          lastPlayedAt: now,
          playCount: sql`${table.playCount} + 1`,
          updatedAt: sql`now()`,
        },
      })
    // The lesson counts as played today even if the session isn't finished.
    await tx
      .insert(userChordGroupProgress)
      .values({ userId, groupId, lastPlayedAt: now, playCount: 0 })
      .onConflictDoUpdate({
        target: [userChordGroupProgress.userId, userChordGroupProgress.groupId],
        set: { lastPlayedAt: now, updatedAt: sql`now()` },
      })
  })
}

/**
 * End of a lesson session: play count + 1, last played now, and completed
 * the first time every item in the lesson has been learned. The server
 * decides completion from stored item progress; the client can't claim it.
 */
export async function finishLesson(
  userId: string,
  groupId: string,
  db: Database = getDb(),
): Promise<LessonProgress> {
  return db.transaction(async (tx) => {
    const group = await requireGroup(groupId, tx)

    const [{ unlearned = 0, total = 0 } = {}] = await tx.execute<{
      unlearned: number
      total: number
    }>(sql`
      select
        count(*)::int as total,
        count(*) filter (where learned_at is null)::int as unlearned
      from (
        select p.learned_at from ${chordGroupChords} m
        left join ${userChordProgress} p on p.chord_id = m.chord_id and p.user_id = ${userId}
        where m.group_id = ${groupId}
        union all
        select p.learned_at from ${chordGroupShapes} m
        left join ${userChordShapeProgress} p on p.shape_id = m.shape_id and p.user_id = ${userId}
        where m.group_id = ${groupId}
      ) items
    `)
    const allLearned = total > 0 && unlearned === 0
    const now = new Date()

    const [saved] = await tx
      .insert(userChordGroupProgress)
      .values({
        userId,
        groupId,
        lastPlayedAt: now,
        playCount: 1,
        completedAt: allLearned ? now : null,
      })
      .onConflictDoUpdate({
        target: [userChordGroupProgress.userId, userChordGroupProgress.groupId],
        set: {
          completedAt: sql`coalesce(${userChordGroupProgress.completedAt}, excluded.completed_at)`,
          lastPlayedAt: now,
          playCount: sql`${userChordGroupProgress.playCount} + 1`,
          updatedAt: sql`now()`,
        },
      })
      .returning({
        completedAt: userChordGroupProgress.completedAt,
        lastPlayedAt: userChordGroupProgress.lastPlayedAt,
        playCount: userChordGroupProgress.playCount,
      })
    if (!saved) throw new Error('Lesson progress upsert returned no row')
    return { slug: group.slug, ...saved }
  })
}

/** Guest timestamps come from the browser: never trust one from the future. */
const fromGuest = (ms: number | null) => (ms === null ? null : new Date(Math.min(ms, Date.now())))

/**
 * Merges progress a guest made in this browser into their account (once,
 * after sign-up; the client clears its copy after success). Merge rules keep
 * the most informative value: earliest completion/learned dates, latest
 * played/skipped dates, summed play counts. Unknown slugs (content renamed or
 * retired since) are skipped, not errors.
 */
export async function importGuestProgress(
  userId: string,
  guest: GuestProgress,
  db: Database = getDb(),
): Promise<{ groups: number; items: number }> {
  return db.transaction(async (tx) => {
    const groupSlugs = Object.keys(guest.groups)
    const chordSlugs: string[] = []
    const shapeSlugs: string[] = []
    for (const key of Object.keys(guest.items)) {
      const [type, slug = ''] = key.split(':')
      ;(type === 'chord' ? chordSlugs : shapeSlugs).push(slug)
    }

    const [groupRows, chordRows, shapeRows] = await Promise.all([
      groupSlugs.length
        ? tx
            .select({ id: chordGroups.id, slug: chordGroups.slug })
            .from(chordGroups)
            .where(inArray(chordGroups.slug, groupSlugs))
        : [],
      chordSlugs.length
        ? tx
            .select({ id: chords.id, slug: chords.slug })
            .from(chords)
            .where(inArray(chords.slug, chordSlugs))
        : [],
      shapeSlugs.length
        ? tx
            .select({ id: chordShapes.id, slug: chordShapes.slug })
            .from(chordShapes)
            .where(inArray(chordShapes.slug, shapeSlugs))
        : [],
    ])

    const groupValues = groupRows.flatMap(({ id, slug }) => {
      const progress = guest.groups[slug]
      return progress
        ? [
            {
              userId,
              groupId: id,
              completedAt: fromGuest(progress.completedAt),
              lastPlayedAt: fromGuest(progress.lastPlayedAt),
              playCount: progress.playCount,
            },
          ]
        : []
    })
    if (groupValues.length) {
      await tx
        .insert(userChordGroupProgress)
        .values(groupValues)
        .onConflictDoUpdate({
          target: [userChordGroupProgress.userId, userChordGroupProgress.groupId],
          set: {
            // least()/greatest() ignore NULLs in Postgres, which is exactly the merge we want.
            completedAt: sql`least(${userChordGroupProgress.completedAt}, excluded.completed_at)`,
            lastPlayedAt: sql`greatest(${userChordGroupProgress.lastPlayedAt}, excluded.last_played_at)`,
            playCount: sql`${userChordGroupProgress.playCount} + excluded.play_count`,
            updatedAt: sql`now()`,
          },
        })
    }

    const itemValues = (rows: Array<{ id: string; slug: string }>, type: 'chord' | 'shape') =>
      rows.flatMap(({ id, slug }) => {
        const progress = guest.items[`${type}:${slug}`]
        return progress
          ? [
              {
                id,
                learnedAt: fromGuest(progress.learnedAt),
                lastPlayedAt: fromGuest(progress.lastPlayedAt),
                lastSkippedAt: fromGuest(progress.lastSkippedAt),
                playCount: progress.playCount,
              },
            ]
          : []
      })
    const mergeItem = (table: typeof userChordProgress | typeof userChordShapeProgress) => ({
      learnedAt: sql`least(${table.learnedAt}, excluded.learned_at)`,
      lastPlayedAt: sql`greatest(${table.lastPlayedAt}, excluded.last_played_at)`,
      lastSkippedAt: sql`greatest(${table.lastSkippedAt}, excluded.last_skipped_at)`,
      playCount: sql`${table.playCount} + excluded.play_count`,
      updatedAt: sql`now()`,
    })

    const chordValues = itemValues(chordRows, 'chord')
    if (chordValues.length) {
      await tx
        .insert(userChordProgress)
        .values(chordValues.map(({ id, ...rest }) => ({ userId, chordId: id, ...rest })))
        .onConflictDoUpdate({
          target: [userChordProgress.userId, userChordProgress.chordId],
          set: mergeItem(userChordProgress),
        })
    }
    const shapeValues = itemValues(shapeRows, 'shape')
    if (shapeValues.length) {
      await tx
        .insert(userChordShapeProgress)
        .values(shapeValues.map(({ id, ...rest }) => ({ userId, shapeId: id, ...rest })))
        .onConflictDoUpdate({
          target: [userChordShapeProgress.userId, userChordShapeProgress.shapeId],
          set: mergeItem(userChordShapeProgress),
        })
    }

    return { groups: groupValues.length, items: chordValues.length + shapeValues.length }
  })
}

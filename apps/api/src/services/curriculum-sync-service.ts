import { type Database, getDb, inArray, sql } from '@repo/db'
import {
  chordGroupChords,
  chordGroupShapes,
  chordGroups,
  chordShapes,
  chords,
  chordVoicings,
} from '@repo/db/schema'
import {
  CHORD_QUALITY_NOTE_COUNT,
  type ChordDiagramData,
  type ChordQuality,
  chordSlug,
  chordSymbol,
  formatShapeQualifier,
  intervalOf,
  pitchClass,
  soundedPitch,
  validateShapeGeometry,
} from '@repo/shared'
import { CHORD_FINGERINGS, SHAPE_FINGERINGS } from '../curriculum/curriculum-fingerings'
import { CURRICULUM, type CurriculumSource } from '../curriculum/curriculum-source'
import { STANDARD_TUNINGS } from '../curriculum/tunings'

export type SyncSummary = {
  chords: number
  shapes: number
  groups: number
  /** In the database but not in the source. Reported, never deleted. */
  orphanedGroupSlugs: string[]
}

/**
 * Makes the database curriculum match the source. Idempotent: upserts by slug,
 * so ids (and every user's progress keyed on them) survive edits, reorders and
 * renames of content.
 *
 * Never deletes chords, shapes or groups: removing a group from the source
 * must not silently take users' progress with it (the progress FKs are
 * `restrict` for the same reason). Orphans are reported for a human to retire.
 * Memberships carry no user data, so they're replaced wholesale per group.
 *
 * One transaction: readers never see a half-synced curriculum.
 */
export type FingeringSource = {
  chords: typeof CHORD_FINGERINGS
  shapes: typeof SHAPE_FINGERINGS
}

const FINGERINGS: FingeringSource = { chords: CHORD_FINGERINGS, shapes: SHAPE_FINGERINGS }

export async function syncCurriculum(
  source: CurriculumSource = CURRICULUM,
  db: Database = getDb(),
  fingerings: FingeringSource = FINGERINGS,
): Promise<SyncSummary> {
  assertValidGeometry(source)

  return db.transaction(async (tx) => {
    const now = sql`now()`

    const chordRows = await tx
      .insert(chords)
      .values(
        source.chords.map(({ root, quality }) => ({
          slug: chordSlug(root, quality),
          name: chordSymbol(root, quality),
          root,
          quality,
        })),
      )
      .onConflictDoUpdate({
        target: chords.slug,
        set: {
          name: sql`excluded.name`,
          root: sql`excluded.root`,
          quality: sql`excluded.quality`,
          updatedAt: now,
        },
      })
      .returning({ id: chords.id, slug: chords.slug })

    const shapeRows = source.shapes.length
      ? await tx
          .insert(chordShapes)
          .values(
            source.shapes.map((shape) => {
              const qualifiers = {
                rootString: shape.rootString,
                inversion: shape.inversion ?? null,
                stringSetStart: shape.stringSetStart ?? null,
                stringSetEnd: shape.stringSetEnd ?? null,
              }
              return {
                slug: shape.slug,
                title: shape.title,
                subtitle: shape.subtitle ?? null,
                quality: shape.quality,
                kind: shape.kind,
                instrument: shape.instrument ?? 'guitar',
                strings: shape.strings,
                description: shape.description,
                ...qualifiers,
                diagram: withShapeIntervals(fingerings.shapes[shape.slug], shape.quality),
                // Deprecated columns, still written for the previous release's
                // code during a rolling deploy. Nothing reads them; removed with
                // the contract migration.
                name: legacyName(shape.title, qualifiers),
                legacyInversion: LEGACY_INVERSION[qualifiers.inversion ?? -1] ?? null,
              }
            }),
          )
          .onConflictDoUpdate({
            target: chordShapes.slug,
            set: {
              title: sql`excluded.title`,
              subtitle: sql`excluded.subtitle`,
              name: sql`excluded.name`,
              quality: sql`excluded.quality`,
              kind: sql`excluded.kind`,
              instrument: sql`excluded.instrument`,
              rootString: sql`excluded.root_string`,
              inversion: sql`excluded.inversion_index`,
              stringSetStart: sql`excluded.string_set_start`,
              stringSetEnd: sql`excluded.string_set_end`,
              legacyInversion: sql`excluded.inversion`,
              strings: sql`excluded.strings`,
              description: sql`excluded.description`,
              diagram: sql`excluded.diagram`,
              updatedAt: now,
            },
          })
          .returning({ id: chordShapes.id, slug: chordShapes.slug })
      : []

    const groupRows = await tx
      .insert(chordGroups)
      .values(
        source.groups.map((group) => ({
          slug: group.slug,
          name: group.name,
          description: group.description,
          focus: group.focus,
          instrument: group.instrument ?? 'guitar',
          lessonNumber: group.lessonNumber,
          sortOrder: group.sortOrder,
        })),
      )
      .onConflictDoUpdate({
        target: chordGroups.slug,
        set: {
          name: sql`excluded.name`,
          description: sql`excluded.description`,
          focus: sql`excluded.focus`,
          instrument: sql`excluded.instrument`,
          // Reordering or renumbering swaps these between rows; the unique
          // constraints are deferred to commit, so that's safe here.
          lessonNumber: sql`excluded.lesson_number`,
          sortOrder: sql`excluded.sort_order`,
          updatedAt: now,
        },
      })
      .returning({ id: chordGroups.id, slug: chordGroups.slug })

    // One default voicing per chord: its standard-tuning fingering. Upserted
    // by slug like everything else, so voicing ids are stable too.
    const qualityOf = new Map(
      source.chords.map((chord) => [chordSlug(chord.root, chord.quality), chord]),
    )
    const voicings = chordRows.flatMap(({ id, slug }) => {
      const chord = qualityOf.get(slug)
      const raw = fingerings.chords[slug]
      const diagram =
        raw && chord ? withIntervals(raw, chord.root, chord.quality, STANDARD_TUNINGS.guitar) : raw
      return diagram
        ? [
            {
              slug: `${slug}-guitar-standard`,
              chordId: id,
              instrument: 'guitar' as const,
              tuning: [...STANDARD_TUNINGS.guitar],
              diagram,
              isDefault: true,
              ...voicingQualifiers(diagram),
            },
          ]
        : []
    })
    if (voicings.length) {
      await tx
        .insert(chordVoicings)
        .values(voicings)
        .onConflictDoUpdate({
          target: chordVoicings.slug,
          set: {
            tuning: sql`excluded.tuning`,
            diagram: sql`excluded.diagram`,
            isDefault: sql`excluded.is_default`,
            rootString: sql`excluded.root_string`,
            inversion: sql`excluded.inversion_index`,
            stringSetStart: sql`excluded.string_set_start`,
            stringSetEnd: sql`excluded.string_set_end`,
            updatedAt: now,
          },
        })
    }

    const chordId = idLookup(chordRows, 'chord')
    const shapeId = idLookup(shapeRows, 'shape')
    const groupId = idLookup(groupRows, 'group')
    const syncedGroupIds = groupRows.map((row) => row.id)

    await tx.delete(chordGroupChords).where(inArray(chordGroupChords.groupId, syncedGroupIds))
    await tx.delete(chordGroupShapes).where(inArray(chordGroupShapes.groupId, syncedGroupIds))

    const chordMembers = source.groups.flatMap((group) =>
      (group.chords ?? []).map((member, index) => ({
        groupId: groupId(group.slug),
        chordId: chordId(member.chord),
        sortOrder: index + 1,
        role: member.role ?? ('introduces' as const),
      })),
    )
    const shapeMembers = source.groups.flatMap((group) =>
      (group.shapes ?? []).map((member, index) => ({
        groupId: groupId(group.slug),
        shapeId: shapeId(member.shape),
        sortOrder: index + 1,
        role: member.role ?? ('introduces' as const),
      })),
    )
    if (chordMembers.length) await tx.insert(chordGroupChords).values(chordMembers)
    if (shapeMembers.length) await tx.insert(chordGroupShapes).values(shapeMembers)

    const sourceSlugs = new Set(source.groups.map((group) => group.slug))
    const allGroups = await tx.select({ slug: chordGroups.slug }).from(chordGroups)
    const orphanedGroupSlugs = allGroups
      .map((group) => group.slug)
      .filter((slug) => !sourceSlugs.has(slug))
      .sort()

    return {
      chords: chordRows.length,
      shapes: shapeRows.length,
      groups: groupRows.length,
      orphanedGroupSlugs,
    }
  })
}

function idLookup(rows: Array<{ id: string; slug: string }>, kind: string) {
  const ids = new Map(rows.map((row) => [row.slug, row.id]))
  return (slug: string) => {
    const id = ids.get(slug)
    // The source test catches this first; this guards a source that skipped it.
    if (!id) throw new Error(`Curriculum references unknown ${kind} "${slug}"`)
    return id
  }
}

const LEGACY_INVERSION: Record<number, 'root' | 'first' | 'second' | 'third'> = {
  0: 'root',
  1: 'first',
  2: 'second',
  3: 'third',
}

/** The deprecated combined `name`, e.g. "Major 7 Shell (6th-string root)". */
function legacyName(title: string, qualifiers: Parameters<typeof formatShapeQualifier>[0]): string {
  const qualifier = formatShapeQualifier(qualifiers)
  return qualifier ? `${title} (${qualifier})` : title
}

/**
 * Qualifiers specific to one voicing, read from its diagram: the root string
 * is the lowest-pitched string marked as a root; root position (0) when the
 * lowest sounded note is a root, otherwise unknown (null) because the diagram
 * alone doesn't say which inversion it is. Same rule as migration 0005's
 * backfill.
 */
export function voicingQualifiers(diagram: ChordDiagramData) {
  const sounded = diagram.positions.map((position) => position.string)
  const roots = diagram.positions
    .filter((position) => position.isRoot)
    .map((position) => position.string)
  const rootString = roots.length ? Math.max(...roots) : null
  const lowestString = sounded.length ? Math.max(...sounded) : null
  return {
    rootString,
    inversion: rootString !== null && rootString === lowestString ? 0 : null,
    stringSetStart: null,
    stringSetEnd: null,
  }
}

/**
 * Shape geometry checked against each shape's instrument before anything is
 * written. String-count limits belong here, with the instrument in hand, not
 * as a global maximum in the database.
 */
function assertValidGeometry(source: CurriculumSource) {
  const problems = source.shapes.flatMap((shape) =>
    validateShapeGeometry(
      {
        rootString: shape.rootString,
        inversion: shape.inversion ?? null,
        stringSetStart: shape.stringSetStart ?? null,
        stringSetEnd: shape.stringSetEnd ?? null,
        strings: shape.strings,
      },
      {
        stringCount: STANDARD_TUNINGS[shape.instrument ?? 'guitar'].length,
        noteCount: CHORD_QUALITY_NOTE_COUNT[shape.quality],
      },
    ).map((problem) => `${shape.slug}: ${problem}`),
  )
  if (problems.length) throw new Error(`Invalid shape geometry:\n${problems.join('\n')}`)
}

/**
 * Stamps each note with its interval from the chord's root ('1', 'b3', '5'…),
 * worked out from the actual pitch (tuning + fret), so it can never disagree
 * with the fingering. Throws on a note outside the chord: that's a fingering
 * mistake, and the sync must not publish it.
 */
export function withIntervals(
  diagram: ChordDiagramData,
  rootName: string,
  quality: ChordQuality,
  tuning: readonly string[],
): ChordDiagramData {
  const root = pitchClass(rootName)
  return {
    ...diagram,
    positions: diagram.positions.map((position) => {
      const interval = intervalOf(
        soundedPitch(tuning, position.string, position.fret),
        root,
        quality,
      )
      if (!interval) {
        throw new Error(
          `String ${position.string} fret ${position.fret} isn't a tone of ${rootName} ${quality}`,
        )
      }
      return { ...position, interval }
    }),
  }
}

/** Shapes are drawn at a sample root (exampleName); intervals are relative to it. */
function withShapeIntervals(
  diagram: ChordDiagramData | undefined,
  quality: ChordQuality,
): ChordDiagramData | null {
  if (!diagram) return null
  const root = diagram.exampleName?.match(/^[A-G][♯♭#b]?/)?.[0]
  return root ? withIntervals(diagram, root, quality, STANDARD_TUNINGS.guitar) : diagram
}

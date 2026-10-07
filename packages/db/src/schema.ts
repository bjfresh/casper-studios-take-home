import { sql } from 'drizzle-orm'
import {
  type AnyPgColumn,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

// Prefer `pgEnum` for Postgres enums. Renaming a value later generates a bare
// cast that fails on existing rows; see the README before editing one.

/** Platform-wide role. Values mirror USER_ROLES in @repo/shared. */
export const userRole = pgEnum('user_role', ['user', 'admin'])

/** Values mirror INSTRUMENTS / HANDEDNESS in @repo/shared. */
export const instrument = pgEnum('instrument', ['guitar', 'bass'])
export const handedness = pgEnum('handedness', ['right', 'left'])
/** Values mirror GUITAR_TYPES in @repo/shared. */
export const guitarType = pgEnum('guitar_type', ['acoustic', 'electric', 'both'])

/**
 * The product's record of a person. Privy owns identity and credentials; this
 * table owns everything about the user that belongs to the product.
 */
export const users = pgTable(
  'users',
  {
    // Our own id. Every foreign key points here, never at the Privy DID, so
    // the vendor identity stays an authentication detail.
    id: uuid('id').primaryKey().defaultRandom(),
    // The Privy DID (did:privy:…).
    privyUserId: text('privy_user_id').notNull(),
    // Cached convenience copy; Privy is the source of truth. May be an Apple
    // private-relay address — an identifier, not a contact guarantee.
    email: text('email'),
    role: userRole('role').notNull().default('user'),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => [
    // What makes the sign-in upsert safe: without it, concurrent first
    // requests from one user would each insert a row.
    uniqueIndex('users_privy_user_id_key').on(table.privyUserId),
  ],
)

/**
 * Player settings, collected before sign-up (held in the browser until the
 * account exists) and edited later in Settings. A separate table rather than
 * columns on `users`: identity and product preferences change for different
 * reasons and at different rates.
 *
 * One row per user (user_id is the primary key, which is also the upsert
 * target). Every column is NOT NULL, so settings are complete or absent by
 * construction — no half-saved state to handle.
 */
export const userSettings = pgTable(
  'user_settings',
  {
    userId: uuid('user_id')
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade' }),
    displayName: text('display_name').notNull(),
    instrument: instrument('instrument').notNull(),
    handedness: handedness('handedness').notNull(),
    /** Guitar only; null until chosen. */
    guitarType: guitarType('guitar_type'),
    /** Bass only (4, 5 or 6); null for guitar. */
    bassStringCount: smallint('bass_string_count'),
    /** Open-string notes, low → high: the same model as chord_voicings.tuning. */
    tuning: text('tuning').array().notNull(),
    // Fretboard labels. Note names and finger numbers share the inside of a
    // marker, so never both (normalizeFretboardDisplaySettings, and the
    // check below as the backstop).
    showNoteNames: boolean('show_note_names').notNull().default(true),
    showFingerNumbers: boolean('show_finger_numbers').notNull().default(false),
    showIntervals: boolean('show_intervals').notNull().default(false),
    /** Seconds per chord before a lesson auto-advances; 0 = off. */
    autoProgressSeconds: smallint('auto_progress_seconds').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      'user_settings_note_label_exclusive',
      sql`not (${table.showNoteNames} and ${table.showFingerNumbers})`,
    ),
    check(
      'user_settings_auto_progress_valid',
      sql`${table.autoProgressSeconds} = 0 or ${table.autoProgressSeconds} between 3 and 30`,
    ),
    check(
      'user_settings_bass_string_count_valid',
      sql`${table.bassStringCount} is null or ${table.bassStringCount} in (4, 5, 6)`,
    ),
    // Guitar: no string count. Bass: a string count and no guitar type.
    check(
      'user_settings_instrument_setup',
      sql`(${table.instrument} = 'guitar' and ${table.bassStringCount} is null) or (${table.instrument} = 'bass' and ${table.bassStringCount} is not null and ${table.guitarType} is null)`,
    ),
    // Settings only know two instruments, so their string counts can be
    // checked here (unlike shapes, whose instrument set will grow).
    check(
      'user_settings_tuning_matches_strings',
      sql`cardinality(${table.tuning}) = case when ${table.instrument} = 'guitar' then 6 else ${table.bassStringCount} end`,
    ),
  ],
)

// ─── Curriculum ──────────────────────────────────────────────────────────────
//
// Five concepts, kept apart so each can grow without the others changing:
//
//   chords                 the musical chord (G major, E7): root + quality only
//   chord_shapes           a voicing/movable shape (E-shape minor, a shell); no fixed root
//   chord_groups           a curriculum step: name, position, focus
//   chord_group_chords /   membership: which chords/shapes a group uses, in
//   chord_group_shapes     what order, and whether it INTRODUCES or PRACTICES them
//   user_*_progress        per-user progress; curriculum rows never hold user data
//
// Curriculum content is reference data synced from apps/api/src/curriculum
// (`pnpm db:curriculum`), not hand-edited and not dev seed data.
//
// Enum values mirror the const objects in @repo/shared (apps/api has a type
// test keeping each pair identical).

export const noteName = pgEnum('note_name', [
  'C',
  'C#',
  'Db',
  'D',
  'D#',
  'Eb',
  'E',
  'F',
  'F#',
  'Gb',
  'G',
  'G#',
  'Ab',
  'A',
  'A#',
  'Bb',
  'B',
])

export const chordQuality = pgEnum('chord_quality', [
  'major',
  'minor',
  'power',
  'dominant_7',
  'major_7',
  'minor_7',
  'half_diminished_7',
  'major_6',
  'minor_6',
  'dominant_9',
])

export const chordShapeKind = pgEnum('chord_shape_kind', ['barre', 'triad', 'shell', 'voicing'])
/** @deprecated Backs the legacy word-valued `chord_shapes.inversion`; use `inversion_index`. */
export const chordInversion = pgEnum('chord_inversion', ['root', 'first', 'second', 'third'])

/**
 * Structured musical qualifiers, shared by shapes and voicings. Display text
 * ("6th-string root", "1st inversion · Strings 1–3") is derived from these
 * (formatShapeQualifier in @repo/shared) and never stored. The checks here are
 * the instrument-independent ones; string-count limits depend on the
 * instrument and are validated in the application (validateShapeGeometry).
 */
const qualifierColumns = () => ({
  rootString: smallint('root_string'),
  /** 0 = root position, 1 = first inversion, … Null where not meaningful. */
  inversion: smallint('inversion_index'),
  stringSetStart: smallint('string_set_start'),
  stringSetEnd: smallint('string_set_end'),
})

type QualifierTable = {
  rootString: AnyPgColumn
  inversion: AnyPgColumn
  stringSetStart: AnyPgColumn
  stringSetEnd: AnyPgColumn
}

const qualifierChecks = (table: string, t: QualifierTable) => [
  check(`${table}_root_string_positive`, sql`${t.rootString} is null or ${t.rootString} > 0`),
  check(`${table}_inversion_index_nonnegative`, sql`${t.inversion} is null or ${t.inversion} >= 0`),
  check(
    `${table}_string_set_valid`,
    sql`(${t.stringSetStart} is null and ${t.stringSetEnd} is null) or (${t.stringSetStart} > 0 and ${t.stringSetEnd} >= ${t.stringSetStart})`,
  ),
]
export const chordGroupFocus = pgEnum('chord_group_focus', ['chords', 'shapes', 'progression'])
export const chordGroupMemberRole = pgEnum('chord_group_member_role', ['introduces', 'practices'])

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}

/**
 * A musical chord with a fixed root. Knows nothing about the curriculum (no
 * order, no group) or about fingering: one chord can be voiced many ways and
 * appear in any number of groups.
 */
export const chords = pgTable(
  'chords',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull(),
    /** Display symbol: G, Em, Cmaj7. */
    name: text('name').notNull(),
    root: noteName('root').notNull(),
    quality: chordQuality('quality').notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('chords_slug_key').on(table.slug),
    // A chord IS its root and quality; two rows for "G major" would split
    // everyone's progress between them.
    uniqueIndex('chords_root_quality_key').on(table.root, table.quality),
  ],
)

/**
 * A voicing or movable shape: E-shape minor, a triad on the top three strings,
 * a 6th-string shell. Has a quality but no fixed root, so movable concepts
 * aren't forced into fixed-root chord rows. Future: alternate tunings add a
 * tuning column here; open-chord fingerings can be shapes or a separate
 * chord_voicings table pointing at chords.
 */
export const chordShapes = pgTable(
  'chord_shapes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull(),
    /** The core concept, without qualifiers: "Major 7 Shell". */
    title: text('title').notNull(),
    /** Descriptive copy only ("Compact version"); never a qualifier that has a field. */
    subtitle: text('subtitle'),
    /**
     * @deprecated Title plus qualifiers as one string ("Major 7 shell (root on
     * 6)"). Still written so code from the previous release keeps working
     * during a rolling deploy; nothing reads it. Drop in the next release
     * (see .agents/rules/curriculum.md).
     */
    name: text('name').notNull(),
    quality: chordQuality('quality').notNull(),
    /** The shape type (barre, triad, shell, voicing); exposed as `shapeType`. */
    kind: chordShapeKind('kind').notNull(),
    instrument: instrument('instrument').notNull().default('guitar'),
    ...qualifierColumns(),
    /** Strings the shape uses, low to high. May be non-contiguous (a 6-4-3 shell). */
    strings: smallint('strings').array().notNull(),
    /** @deprecated Word-valued inversion; use `inversion` (inversion_index). Same lifecycle as `name`. */
    legacyInversion: chordInversion('inversion'),
    description: text('description'),
    /**
     * Example fingering for the lesson diagram, drawn at a sample root
     * (exampleName says which). JSON validated against chordDiagramSchema in
     * @repo/shared whenever it's read. Null means no diagram yet. Drawn in the
     * instrument's standard tuning; alternate tunings will add a tuning column.
     */
    diagram: jsonb('diagram'),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('chord_shapes_slug_key').on(table.slug),
    ...qualifierChecks('chord_shapes', table),
  ],
)

/**
 * A curriculum step. Two numbers, deliberately separate:
 *
 *   lesson_number  what the learner sees ("Lesson 4"). Null for content off
 *                  the main path: review groups, bonus lessons, optional theory.
 *   sort_order     where the app positions the group. Spaced in tens
 *                  (10, 20, 30…) so a group can be inserted between two
 *                  lessons without renumbering anything else.
 *
 * Nothing about order lives on chords; `focus` describes the group, and
 * membership roles say what's new.
 *
 * Both are unique per instrument (each instrument has its own Lesson 1). The
 * constraints are DEFERRABLE INITIALLY DEFERRED (hand-added in migration 0003;
 * Drizzle can't express it): reordering swaps values between rows, which an
 * immediate check would reject mid-transaction even though the result is
 * valid. They're checked once, at commit.
 */
export const chordGroups = pgTable(
  'chord_groups',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    description: text('description').notNull(),
    lessonNumber: integer('lesson_number'),
    sortOrder: integer('sort_order').notNull(),
    focus: chordGroupFocus('focus').notNull(),
    instrument: instrument('instrument').notNull().default('guitar'),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('chord_groups_slug_key').on(table.slug),
    // Also the index for "groups in curriculum order".
    unique('chord_groups_instrument_sort_order_key').on(table.instrument, table.sortOrder),
    // NULLs are distinct in a unique constraint, so any number of unnumbered
    // (review/bonus) groups can coexist.
    unique('chord_groups_instrument_lesson_number_key').on(table.instrument, table.lessonNumber),
    check('chord_groups_sort_order_nonnegative', sql`${table.sortOrder} >= 0`),
    check(
      'chord_groups_lesson_number_positive',
      sql`${table.lessonNumber} is null or ${table.lessonNumber} > 0`,
    ),
  ],
)

/**
 * How to play a chord: one fingering for one instrument and tuning. Distinct
 * from the chord itself, so a chord can have many voicings (open, barre, for
 * bass, in drop D…). Lessons show the chord's DEFAULT voicing for the lesson's
 * instrument.
 */
export const chordVoicings = pgTable(
  'chord_voicings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull(),
    chordId: uuid('chord_id')
      .notNull()
      .references(() => chords.id, { onDelete: 'restrict' }),
    instrument: instrument('instrument').notNull().default('guitar'),
    /** Open-string notes, low → high. Its length is the string count. */
    tuning: text('tuning').array().notNull(),
    /** JSON, validated against chordDiagramSchema in @repo/shared on read. */
    diagram: jsonb('diagram').notNull(),
    isDefault: boolean('is_default').notNull().default(false),
    /**
     * Qualifiers SPECIFIC to this voicing (an open C's root is on string 5).
     * Reusable geometry belongs on chord_shapes instead.
     */
    ...qualifierColumns(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('chord_voicings_slug_key').on(table.slug),
    ...qualifierChecks('chord_voicings', table),
    // At most one default voicing per chord and instrument.
    uniqueIndex('chord_voicings_default_key')
      .on(table.chordId, table.instrument)
      .where(sql`${table.isDefault}`),
  ],
)

/** Which chords a group uses. The same chord may belong to many groups. */
export const chordGroupChords = pgTable(
  'chord_group_chords',
  {
    groupId: uuid('group_id')
      .notNull()
      .references(() => chordGroups.id, { onDelete: 'cascade' }),
    // restrict: deleting a chord that a group still uses is a curriculum
    // mistake, not something to cascade quietly.
    chordId: uuid('chord_id')
      .notNull()
      .references(() => chords.id, { onDelete: 'restrict' }),
    sortOrder: smallint('sort_order').notNull(),
    role: chordGroupMemberRole('role').notNull().default('introduces'),
  },
  (table) => [
    primaryKey({ columns: [table.groupId, table.chordId] }),
    uniqueIndex('chord_group_chords_group_sort_key').on(table.groupId, table.sortOrder),
    index('chord_group_chords_chord_idx').on(table.chordId),
  ],
)

/** Which shapes a group uses. Separate from chords so each join keeps a real FK. */
export const chordGroupShapes = pgTable(
  'chord_group_shapes',
  {
    groupId: uuid('group_id')
      .notNull()
      .references(() => chordGroups.id, { onDelete: 'cascade' }),
    shapeId: uuid('shape_id')
      .notNull()
      .references(() => chordShapes.id, { onDelete: 'restrict' }),
    sortOrder: smallint('sort_order').notNull(),
    role: chordGroupMemberRole('role').notNull().default('introduces'),
  },
  (table) => [
    primaryKey({ columns: [table.groupId, table.shapeId] }),
    uniqueIndex('chord_group_shapes_group_sort_key').on(table.groupId, table.sortOrder),
    index('chord_group_shapes_shape_idx').on(table.shapeId),
  ],
)

/**
 * One user's progress on one group. A row appears on first practice.
 * completed_at is the FIRST completion and never moves; last_played_at and
 * play_count move on every qualifying session. Enough history for a real
 * spaced-repetition policy later without a schema change.
 */
export const userChordGroupProgress = pgTable(
  'user_chord_group_progress',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // restrict: a group with user progress must never disappear by cascade.
    groupId: uuid('group_id')
      .notNull()
      .references(() => chordGroups.id, { onDelete: 'restrict' }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    lastPlayedAt: timestamp('last_played_at', { withTimezone: true }),
    playCount: integer('play_count').notNull().default(0),
    ...timestamps,
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.groupId] }),
    // "least recently practiced" and "not practiced since X" scan by user.
    index('user_chord_group_progress_user_last_played_idx').on(table.userId, table.lastPlayedAt),
    check('user_chord_group_progress_play_count_nonnegative', sql`${table.playCount} >= 0`),
  ],
)

/**
 * Per-chord progress, separate from group progress: a session can cover a
 * group without touching every chord in it. learned_at mirrors completed_at
 * (first time only).
 */
export const userChordProgress = pgTable(
  'user_chord_progress',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    chordId: uuid('chord_id')
      .notNull()
      .references(() => chords.id, { onDelete: 'restrict' }),
    learnedAt: timestamp('learned_at', { withTimezone: true }),
    lastPlayedAt: timestamp('last_played_at', { withTimezone: true }),
    /** A skip is recorded, but isn't practice: it leaves learned/played alone. */
    lastSkippedAt: timestamp('last_skipped_at', { withTimezone: true }),
    playCount: integer('play_count').notNull().default(0),
    ...timestamps,
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.chordId] }),
    index('user_chord_progress_user_last_played_idx').on(table.userId, table.lastPlayedAt),
    check('user_chord_progress_play_count_nonnegative', sql`${table.playCount} >= 0`),
  ],
)

/** Per-shape progress, for shape lessons (barre shapes, triads, shells…). Same rules as chords. */
export const userChordShapeProgress = pgTable(
  'user_chord_shape_progress',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    shapeId: uuid('shape_id')
      .notNull()
      .references(() => chordShapes.id, { onDelete: 'restrict' }),
    learnedAt: timestamp('learned_at', { withTimezone: true }),
    lastPlayedAt: timestamp('last_played_at', { withTimezone: true }),
    lastSkippedAt: timestamp('last_skipped_at', { withTimezone: true }),
    playCount: integer('play_count').notNull().default(0),
    ...timestamps,
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.shapeId] }),
    index('user_chord_shape_progress_user_last_played_idx').on(table.userId, table.lastPlayedAt),
    check('user_chord_shape_progress_play_count_nonnegative', sql`${table.playCount} >= 0`),
  ],
)

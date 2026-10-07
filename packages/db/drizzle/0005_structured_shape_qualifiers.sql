-- Hand-edited (see packages/db/README.md "Migrations"): drizzle-kit generated
-- the columns and checks; the parse-based backfill, validation, and
-- add-nullable-then-NOT-NULL ordering are added by hand.
--
-- Expand only. The combined `name` and the word-valued `inversion` columns
-- stay populated for code from the previous release; they're dropped in a
-- later migration once nothing reads them. IDs, memberships, voicing and
-- shape relationships, and all user progress are untouched: this migration
-- only adds columns to chord_shapes and chord_voicings and fills them.

-- 1. Nullable structured columns.
ALTER TABLE "chord_shapes" ADD COLUMN "title" text;--> statement-breakpoint
ALTER TABLE "chord_shapes" ADD COLUMN "subtitle" text;--> statement-breakpoint
ALTER TABLE "chord_shapes" ADD COLUMN "inversion_index" smallint;--> statement-breakpoint
ALTER TABLE "chord_shapes" ADD COLUMN "string_set_start" smallint;--> statement-breakpoint
ALTER TABLE "chord_shapes" ADD COLUMN "string_set_end" smallint;--> statement-breakpoint
ALTER TABLE "chord_voicings" ADD COLUMN "root_string" smallint;--> statement-breakpoint
ALTER TABLE "chord_voicings" ADD COLUMN "inversion_index" smallint;--> statement-breakpoint
ALTER TABLE "chord_voicings" ADD COLUMN "string_set_start" smallint;--> statement-breakpoint
ALTER TABLE "chord_voicings" ADD COLUMN "string_set_end" smallint;--> statement-breakpoint

-- 2a. Shapes: parse the two qualifier formats `name` has ever used, explicitly.
--     "Major 7 shell (root on 6)"                 → title, root_string
UPDATE "chord_shapes"
SET "title" = m[1],
    "root_string" = coalesce("root_string", m[2]::smallint)
FROM (SELECT id, regexp_match(name, '^(.+) \(root on ([0-9]+)\)$') AS m FROM "chord_shapes") parsed
WHERE parsed.id = "chord_shapes".id AND m IS NOT NULL;--> statement-breakpoint

--     "Major triad, 1st inversion (strings 3–1)"   → title, inversion, string set
--     (the set may be written high–low; it's stored low number first)
UPDATE "chord_shapes"
SET "title" = m[1],
    "inversion_index" = CASE m[2]
      WHEN 'root position' THEN 0 WHEN '1st inversion' THEN 1
      WHEN '2nd inversion' THEN 2 WHEN '3rd inversion' THEN 3 END,
    "string_set_start" = least(m[3]::smallint, m[4]::smallint),
    "string_set_end" = greatest(m[3]::smallint, m[4]::smallint)
FROM (
  SELECT id, regexp_match(name, '^(.+), (root position|1st inversion|2nd inversion|3rd inversion) \(strings ([0-9]+)[–-]([0-9]+)\)$') AS m
  FROM "chord_shapes"
) parsed
WHERE parsed.id = "chord_shapes".id AND m IS NOT NULL;--> statement-breakpoint

--     Anything else with a parenthetical isn't a format we know: don't guess.
--     Keep the parenthetical as subtitle text; structured fields stay null.
UPDATE "chord_shapes"
SET "title" = m[1], "subtitle" = m[2]
FROM (SELECT id, regexp_match(name, '^(.+) \((.+)\)$') AS m FROM "chord_shapes") parsed
WHERE parsed.id = "chord_shapes".id AND "chord_shapes"."title" IS NULL AND m IS NOT NULL;--> statement-breakpoint

--     No qualifier at all ("E-shape major"): the name is the title.
UPDATE "chord_shapes" SET "title" = "name" WHERE "title" IS NULL;--> statement-breakpoint

--     The legacy word-valued column is structured data too: carry it over
--     where the name didn't say.
UPDATE "chord_shapes"
SET "inversion_index" = CASE "inversion"
  WHEN 'root' THEN 0 WHEN 'first' THEN 1 WHEN 'second' THEN 2 WHEN 'third' THEN 3 END
WHERE "inversion_index" IS NULL AND "inversion" IS NOT NULL;--> statement-breakpoint

-- 2b. Voicings: qualifiers specific to each voicing, read from its diagram.
--     Root string = the lowest-pitched string (highest number) marked root.
--     Root position (0) when the lowest sounded note is a root; otherwise
--     left null: the diagram alone doesn't say which inversion it is.
UPDATE "chord_voicings" v
SET "root_string" = roots.root_string,
    "inversion_index" = CASE WHEN roots.root_string = lowest.lowest_string THEN 0 END
FROM
  (SELECT id, max((p->>'string')::smallint) AS root_string
     FROM "chord_voicings", jsonb_array_elements(diagram->'positions') p
     WHERE (p->>'isRoot')::boolean GROUP BY id) roots,
  (SELECT id, max((p->>'string')::smallint) AS lowest_string
     FROM "chord_voicings", jsonb_array_elements(diagram->'positions') p
     GROUP BY id) lowest
WHERE roots.id = v.id AND lowest.id = v.id;--> statement-breakpoint

-- 3. Validate before constraining, with a message a human can act on.
DO $$
DECLARE
  problem text;
BEGIN
  SELECT string_agg(slug, ', ') INTO problem FROM chord_shapes WHERE title IS NULL OR title = '';
  IF problem IS NOT NULL THEN
    RAISE EXCEPTION 'chord_shapes without a title after backfill: %', problem;
  END IF;
  SELECT string_agg(slug, ', ') INTO problem FROM chord_shapes
  WHERE title ~ '\((root on|strings) ' OR title ~ ', (root position|[0-9](st|nd|rd|th) inversion)';
  IF problem IS NOT NULL THEN
    RAISE EXCEPTION 'chord_shapes titles still contain qualifier text: %', problem;
  END IF;
  SELECT string_agg(slug, ', ') INTO problem FROM chord_shapes
  WHERE root_string IS NOT NULL AND NOT (root_string = ANY (strings));
  IF problem IS NOT NULL THEN
    RAISE EXCEPTION 'chord_shapes root_string is not one of the strings they use: %', problem;
  END IF;
END $$;--> statement-breakpoint

-- 4. Constraints, now that the data satisfies them.
ALTER TABLE "chord_shapes" ALTER COLUMN "title" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "chord_shapes" ADD CONSTRAINT "chord_shapes_inversion_index_nonnegative" CHECK ("chord_shapes"."inversion_index" is null or "chord_shapes"."inversion_index" >= 0);--> statement-breakpoint
ALTER TABLE "chord_shapes" ADD CONSTRAINT "chord_shapes_string_set_valid" CHECK (("chord_shapes"."string_set_start" is null and "chord_shapes"."string_set_end" is null) or ("chord_shapes"."string_set_start" > 0 and "chord_shapes"."string_set_end" >= "chord_shapes"."string_set_start"));--> statement-breakpoint
ALTER TABLE "chord_voicings" ADD CONSTRAINT "chord_voicings_root_string_positive" CHECK ("chord_voicings"."root_string" is null or "chord_voicings"."root_string" > 0);--> statement-breakpoint
ALTER TABLE "chord_voicings" ADD CONSTRAINT "chord_voicings_inversion_index_nonnegative" CHECK ("chord_voicings"."inversion_index" is null or "chord_voicings"."inversion_index" >= 0);--> statement-breakpoint
ALTER TABLE "chord_voicings" ADD CONSTRAINT "chord_voicings_string_set_valid" CHECK (("chord_voicings"."string_set_start" is null and "chord_voicings"."string_set_end" is null) or ("chord_voicings"."string_set_start" > 0 and "chord_voicings"."string_set_end" >= "chord_voicings"."string_set_start"));

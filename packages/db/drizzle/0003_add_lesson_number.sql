-- Hand-edited (see packages/db/README.md "Migrations"): drizzle-kit generated
-- the column and constraints; the backfill, validation and DEFERRABLE are
-- added by hand. Order: add nullable → backfill → validate → constrain.
--
-- Only lesson_number and sort_order change, and only on chord_groups. IDs,
-- memberships (chord_group_chords / chord_group_shapes) and user progress
-- (user_chord_group_progress, user_chord_progress) are untouched.

-- 1. New column, nullable for good: review/bonus groups have no lesson number.
ALTER TABLE "chord_groups" ADD COLUMN "lesson_number" integer;--> statement-breakpoint

-- 2. Backfill the main guitar path by stable slug. sort_order moves from
--    1..13 to 10..130 so groups can be inserted between lessons later.
UPDATE "chord_groups" AS g
SET "lesson_number" = v.lesson_number,
    "sort_order" = v.sort_order,
    "updated_at" = now()
FROM (VALUES
  ('first-chords', 1, 10),
  ('first-minors', 2, 20),
  ('the-c-family', 3, 30),
  ('the-a-family', 4, 40),
  ('seventh-chords', 5, 50),
  ('power-chords', 6, 60),
  ('the-missing-chords', 7, 70),
  ('movable-major-and-minor', 8, 80),
  ('small-chords', 9, 90),
  ('major-and-minor-sevenths', 10, 100),
  ('shell-chords', 11, 110),
  ('ii-v-i', 12, 120),
  ('jazz-colors', 13, 130)
) AS v(slug, lesson_number, sort_order)
WHERE g."slug" = v.slug AND g."instrument" = 'guitar';--> statement-breakpoint

-- 3. Validate before constraining, with a message a human can act on. A group
--    this migration doesn't know (e.g. one added only in some environment)
--    keeps its old sort_order and could collide with the new values; stop
--    rather than guess where it belongs.
DO $$
DECLARE
  clash text;
BEGIN
  SELECT string_agg(format('%s/%s: %s', instrument, sort_order, slugs), '; ')
  INTO clash
  FROM (
    SELECT instrument, sort_order, string_agg(slug, ', ' ORDER BY slug) AS slugs
    FROM chord_groups
    GROUP BY instrument, sort_order
    HAVING count(*) > 1
  ) duplicates;
  IF clash IS NOT NULL THEN
    RAISE EXCEPTION 'chord_groups sort_order collides after backfill (%). Give these groups a sort_order before migrating.', clash;
  END IF;
END $$;--> statement-breakpoint

-- 4. Constraints, now that the data satisfies them. The old non-unique index
--    is replaced by the unique constraint's index.
DROP INDEX "chord_groups_instrument_sort_order_idx";--> statement-breakpoint
-- DEFERRABLE INITIALLY DEFERRED: reordering lessons swaps values between rows,
-- which an immediate check rejects mid-transaction even when the end state is
-- valid. Checked at commit instead.
ALTER TABLE "chord_groups" ADD CONSTRAINT "chord_groups_instrument_sort_order_key" UNIQUE("instrument","sort_order") DEFERRABLE INITIALLY DEFERRED;--> statement-breakpoint
ALTER TABLE "chord_groups" ADD CONSTRAINT "chord_groups_instrument_lesson_number_key" UNIQUE("instrument","lesson_number") DEFERRABLE INITIALLY DEFERRED;--> statement-breakpoint
ALTER TABLE "chord_groups" ADD CONSTRAINT "chord_groups_lesson_number_positive" CHECK ("chord_groups"."lesson_number" is null or "chord_groups"."lesson_number" > 0);

-- Hand-edited (see packages/db/README.md "Migrations"): drizzle-kit generated
-- the columns and checks; the backfill, validation, and nullable-then-NOT-NULL
-- ordering for `tuning` are added by hand.
--
-- Only adds columns to user_settings and fills them. Every existing value
-- (display_name, instrument, handedness) is kept as is; no other table is
-- touched, so learning progress is unaffected.

CREATE TYPE "public"."guitar_type" AS ENUM('acoustic', 'electric', 'both');--> statement-breakpoint

-- 1. New columns. The display flags take their defaults (note names on,
--    finger numbers and intervals off), which is the backfill for them, and
--    are exclusive by construction. `tuning` starts nullable so it can be
--    filled per row.
ALTER TABLE "user_settings" ADD COLUMN "guitar_type" "guitar_type";--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "bass_string_count" smallint;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "tuning" text[];--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "show_note_names" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "show_finger_numbers" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "show_intervals" boolean DEFAULT false NOT NULL;--> statement-breakpoint

-- 2. Backfill from what each player already chose: bass players get the
--    standard 4-string setup, guitarists standard 6-string tuning. Guitar
--    type stays unset (nobody has been asked yet). These match DEFAULT_
--    PREFERENCES and standardTuning() in @repo/shared.
UPDATE "user_settings"
SET "bass_string_count" = CASE WHEN "instrument" = 'bass' THEN 4 END,
    "tuning" = CASE WHEN "instrument" = 'bass'
      THEN ARRAY['E', 'A', 'D', 'G']
      ELSE ARRAY['E', 'A', 'D', 'G', 'B', 'E'] END
WHERE "tuning" IS NULL;--> statement-breakpoint

-- 3. Validate before constraining.
DO $$
DECLARE
  problem bigint;
BEGIN
  SELECT count(*) INTO problem FROM user_settings WHERE tuning IS NULL;
  IF problem > 0 THEN
    RAISE EXCEPTION 'user_settings: % rows still have no tuning after backfill', problem;
  END IF;
  SELECT count(*) INTO problem FROM user_settings WHERE show_note_names AND show_finger_numbers;
  IF problem > 0 THEN
    RAISE EXCEPTION 'user_settings: % rows have both note names and finger numbers on', problem;
  END IF;
END $$;--> statement-breakpoint

-- 4. Constraints.
ALTER TABLE "user_settings" ALTER COLUMN "tuning" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_note_label_exclusive" CHECK (not ("user_settings"."show_note_names" and "user_settings"."show_finger_numbers"));--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_bass_string_count_valid" CHECK ("user_settings"."bass_string_count" is null or "user_settings"."bass_string_count" in (4, 5, 6));--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_instrument_setup" CHECK (("user_settings"."instrument" = 'guitar' and "user_settings"."bass_string_count" is null) or ("user_settings"."instrument" = 'bass' and "user_settings"."bass_string_count" is not null and "user_settings"."guitar_type" is null));--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_tuning_matches_strings" CHECK (cardinality("user_settings"."tuning") = case when "user_settings"."instrument" = 'guitar' then 6 else "user_settings"."bass_string_count" end);

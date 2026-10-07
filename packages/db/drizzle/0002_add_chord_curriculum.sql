CREATE TYPE "public"."chord_group_focus" AS ENUM('chords', 'shapes', 'progression');--> statement-breakpoint
CREATE TYPE "public"."chord_group_member_role" AS ENUM('introduces', 'practices');--> statement-breakpoint
CREATE TYPE "public"."chord_inversion" AS ENUM('root', 'first', 'second', 'third');--> statement-breakpoint
CREATE TYPE "public"."chord_quality" AS ENUM('major', 'minor', 'power', 'dominant_7', 'major_7', 'minor_7', 'half_diminished_7', 'major_6', 'minor_6', 'dominant_9');--> statement-breakpoint
CREATE TYPE "public"."chord_shape_kind" AS ENUM('barre', 'triad', 'shell', 'voicing');--> statement-breakpoint
CREATE TYPE "public"."note_name" AS ENUM('C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B');--> statement-breakpoint
CREATE TABLE "chord_group_chords" (
	"group_id" uuid NOT NULL,
	"chord_id" uuid NOT NULL,
	"sort_order" smallint NOT NULL,
	"role" "chord_group_member_role" DEFAULT 'introduces' NOT NULL,
	CONSTRAINT "chord_group_chords_group_id_chord_id_pk" PRIMARY KEY("group_id","chord_id")
);
--> statement-breakpoint
CREATE TABLE "chord_group_shapes" (
	"group_id" uuid NOT NULL,
	"shape_id" uuid NOT NULL,
	"sort_order" smallint NOT NULL,
	"role" "chord_group_member_role" DEFAULT 'introduces' NOT NULL,
	CONSTRAINT "chord_group_shapes_group_id_shape_id_pk" PRIMARY KEY("group_id","shape_id")
);
--> statement-breakpoint
CREATE TABLE "chord_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"sort_order" integer NOT NULL,
	"focus" "chord_group_focus" NOT NULL,
	"instrument" "instrument" DEFAULT 'guitar' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chord_groups_sort_order_nonnegative" CHECK ("chord_groups"."sort_order" >= 0)
);
--> statement-breakpoint
CREATE TABLE "chord_shapes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"quality" "chord_quality" NOT NULL,
	"kind" "chord_shape_kind" NOT NULL,
	"instrument" "instrument" DEFAULT 'guitar' NOT NULL,
	"root_string" smallint,
	"strings" smallint[] NOT NULL,
	"inversion" "chord_inversion",
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chord_shapes_root_string_positive" CHECK ("chord_shapes"."root_string" is null or "chord_shapes"."root_string" > 0)
);
--> statement-breakpoint
CREATE TABLE "chords" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"root" "note_name" NOT NULL,
	"quality" "chord_quality" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_chord_group_progress" (
	"user_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"completed_at" timestamp with time zone,
	"last_played_at" timestamp with time zone,
	"play_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_chord_group_progress_user_id_group_id_pk" PRIMARY KEY("user_id","group_id"),
	CONSTRAINT "user_chord_group_progress_play_count_nonnegative" CHECK ("user_chord_group_progress"."play_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "user_chord_progress" (
	"user_id" uuid NOT NULL,
	"chord_id" uuid NOT NULL,
	"learned_at" timestamp with time zone,
	"last_played_at" timestamp with time zone,
	"play_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_chord_progress_user_id_chord_id_pk" PRIMARY KEY("user_id","chord_id"),
	CONSTRAINT "user_chord_progress_play_count_nonnegative" CHECK ("user_chord_progress"."play_count" >= 0)
);
--> statement-breakpoint
ALTER TABLE "chord_group_chords" ADD CONSTRAINT "chord_group_chords_group_id_chord_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."chord_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chord_group_chords" ADD CONSTRAINT "chord_group_chords_chord_id_chords_id_fk" FOREIGN KEY ("chord_id") REFERENCES "public"."chords"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chord_group_shapes" ADD CONSTRAINT "chord_group_shapes_group_id_chord_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."chord_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chord_group_shapes" ADD CONSTRAINT "chord_group_shapes_shape_id_chord_shapes_id_fk" FOREIGN KEY ("shape_id") REFERENCES "public"."chord_shapes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_chord_group_progress" ADD CONSTRAINT "user_chord_group_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_chord_group_progress" ADD CONSTRAINT "user_chord_group_progress_group_id_chord_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."chord_groups"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_chord_progress" ADD CONSTRAINT "user_chord_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_chord_progress" ADD CONSTRAINT "user_chord_progress_chord_id_chords_id_fk" FOREIGN KEY ("chord_id") REFERENCES "public"."chords"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "chord_group_chords_group_sort_key" ON "chord_group_chords" USING btree ("group_id","sort_order");--> statement-breakpoint
CREATE INDEX "chord_group_chords_chord_idx" ON "chord_group_chords" USING btree ("chord_id");--> statement-breakpoint
CREATE UNIQUE INDEX "chord_group_shapes_group_sort_key" ON "chord_group_shapes" USING btree ("group_id","sort_order");--> statement-breakpoint
CREATE INDEX "chord_group_shapes_shape_idx" ON "chord_group_shapes" USING btree ("shape_id");--> statement-breakpoint
CREATE UNIQUE INDEX "chord_groups_slug_key" ON "chord_groups" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "chord_groups_instrument_sort_order_idx" ON "chord_groups" USING btree ("instrument","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "chord_shapes_slug_key" ON "chord_shapes" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "chords_slug_key" ON "chords" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "chords_root_quality_key" ON "chords" USING btree ("root","quality");--> statement-breakpoint
CREATE INDEX "user_chord_group_progress_user_last_played_idx" ON "user_chord_group_progress" USING btree ("user_id","last_played_at");--> statement-breakpoint
CREATE INDEX "user_chord_progress_user_last_played_idx" ON "user_chord_progress" USING btree ("user_id","last_played_at");
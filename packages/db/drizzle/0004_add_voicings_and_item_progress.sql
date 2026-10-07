CREATE TABLE "chord_voicings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"chord_id" uuid NOT NULL,
	"instrument" "instrument" DEFAULT 'guitar' NOT NULL,
	"tuning" text[] NOT NULL,
	"diagram" jsonb NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_chord_shape_progress" (
	"user_id" uuid NOT NULL,
	"shape_id" uuid NOT NULL,
	"learned_at" timestamp with time zone,
	"last_played_at" timestamp with time zone,
	"last_skipped_at" timestamp with time zone,
	"play_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_chord_shape_progress_user_id_shape_id_pk" PRIMARY KEY("user_id","shape_id"),
	CONSTRAINT "user_chord_shape_progress_play_count_nonnegative" CHECK ("user_chord_shape_progress"."play_count" >= 0)
);
--> statement-breakpoint
ALTER TABLE "chord_shapes" ADD COLUMN "diagram" jsonb;--> statement-breakpoint
ALTER TABLE "user_chord_progress" ADD COLUMN "last_skipped_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "chord_voicings" ADD CONSTRAINT "chord_voicings_chord_id_chords_id_fk" FOREIGN KEY ("chord_id") REFERENCES "public"."chords"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_chord_shape_progress" ADD CONSTRAINT "user_chord_shape_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_chord_shape_progress" ADD CONSTRAINT "user_chord_shape_progress_shape_id_chord_shapes_id_fk" FOREIGN KEY ("shape_id") REFERENCES "public"."chord_shapes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "chord_voicings_slug_key" ON "chord_voicings" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "chord_voicings_default_key" ON "chord_voicings" USING btree ("chord_id","instrument") WHERE "chord_voicings"."is_default";--> statement-breakpoint
CREATE INDEX "user_chord_shape_progress_user_last_played_idx" ON "user_chord_shape_progress" USING btree ("user_id","last_played_at");
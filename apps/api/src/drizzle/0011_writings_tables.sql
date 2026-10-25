CREATE TYPE "app"."cover_color" AS ENUM('sand', 'lavender_soft', 'lavender', 'sage', 'peach', 'ink');--> statement-breakpoint
CREATE TYPE "app"."cover_mode" AS ENUM('auto', 'color', 'image', 'none');--> statement-breakpoint
CREATE TYPE "app"."note_template_key" AS ENUM('character', 'species', 'place');--> statement-breakpoint
CREATE TYPE "app"."option_tone" AS ENUM('ink', 'accent', 'soft', 'warm', 'muted');--> statement-breakpoint
CREATE TYPE "app"."page_kind" AS ENUM('chapter', 'note', 'page');--> statement-breakpoint
CREATE TYPE "app"."page_status" AS ENUM('none', 'pending', 'in_progress', 'done');--> statement-breakpoint
CREATE TYPE "app"."story_color" AS ENUM('ink', 'lavender', 'sand');--> statement-breakpoint
CREATE TYPE "app"."story_kind" AS ENUM('story', 'notebook');--> statement-breakpoint
CREATE TYPE "app"."story_status" AS ENUM('idea', 'in_progress', 'done');--> statement-breakpoint
CREATE TABLE "app"."characters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"world_id" uuid NOT NULL,
	"name" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"draft" boolean DEFAULT false NOT NULL,
	"values" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"content" jsonb,
	"cover_mode" "app"."cover_mode" DEFAULT 'auto' NOT NULL,
	"cover_color" "app"."cover_color",
	"cover_path" text,
	"cover_position" smallint DEFAULT 1 NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"sections" uuid[] DEFAULT '{}' NOT NULL,
	"image_path" text
);
--> statement-breakpoint
ALTER TABLE "app"."characters" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."note_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"world_id" uuid NOT NULL,
	"key" "app"."note_template_key",
	"name" text NOT NULL,
	"color" "app"."option_tone" DEFAULT 'muted' NOT NULL,
	"fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."note_templates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"story_id" uuid,
	"parent_id" uuid,
	"kind" "app"."page_kind" NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"content" jsonb NOT NULL,
	"status" "app"."page_status" DEFAULT 'none' NOT NULL,
	"tag" text,
	"word_count" integer DEFAULT 0 NOT NULL,
	"cover_path" text,
	"position" integer DEFAULT 0 NOT NULL,
	"arc_id" uuid,
	"era_id" uuid,
	"pov_character_id" uuid,
	CONSTRAINT "pages_word_count_non_negative" CHECK ("app"."pages"."word_count" >= 0)
);
--> statement-breakpoint
ALTER TABLE "app"."pages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."stories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"world_id" uuid,
	"title" text NOT NULL,
	"kind" "app"."story_kind" NOT NULL,
	"status" "app"."story_status" DEFAULT 'in_progress' NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"word_goal" integer,
	"color" "app"."story_color" DEFAULT 'ink' NOT NULL,
	"era_id" uuid,
	"place_id" uuid,
	"arcs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"cast" uuid[] DEFAULT '{}' NOT NULL,
	"resources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	CONSTRAINT "stories_word_goal_positive" CHECK ("app"."stories"."word_goal" is null or "app"."stories"."word_goal" > 0)
);
--> statement-breakpoint
ALTER TABLE "app"."stories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."world_eras" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"world_id" uuid NOT NULL,
	"name" text NOT NULL,
	"short_name" text DEFAULT '' NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."world_eras" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."world_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"era_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"causes" text DEFAULT '' NOT NULL,
	"consequences" text DEFAULT '' NOT NULL,
	"notes" text[] DEFAULT '{}' NOT NULL,
	"who" uuid[] DEFAULT '{}' NOT NULL,
	"where" uuid[] DEFAULT '{}' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."world_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."world_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"world_id" uuid NOT NULL,
	"template_id" uuid NOT NULL,
	"parent_id" uuid,
	"name" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"draft" boolean DEFAULT false NOT NULL,
	"values" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"content" jsonb,
	"cover_mode" "app"."cover_mode" DEFAULT 'auto' NOT NULL,
	"cover_color" "app"."cover_color",
	"cover_path" text,
	"cover_position" smallint DEFAULT 1 NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."world_notes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."worlds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"cover_path" text,
	"map_path" text,
	"synopsis" text DEFAULT '' NOT NULL,
	"rules" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"tabs" jsonb,
	"stats" jsonb
);
--> statement-breakpoint
ALTER TABLE "app"."worlds" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."writing_days" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"day_on" date NOT NULL,
	"words" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "writing_days_words_non_negative" CHECK ("app"."writing_days"."words" >= 0)
);
--> statement-breakpoint
ALTER TABLE "app"."writing_days" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."characters" ADD CONSTRAINT "characters_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."characters" ADD CONSTRAINT "characters_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "app"."worlds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."note_templates" ADD CONSTRAINT "note_templates_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."note_templates" ADD CONSTRAINT "note_templates_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "app"."worlds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."pages" ADD CONSTRAINT "pages_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."pages" ADD CONSTRAINT "pages_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "app"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."pages" ADD CONSTRAINT "pages_parent_id_pages_id_fk" FOREIGN KEY ("parent_id") REFERENCES "app"."pages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."pages" ADD CONSTRAINT "pages_era_id_world_eras_id_fk" FOREIGN KEY ("era_id") REFERENCES "app"."world_eras"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."pages" ADD CONSTRAINT "pages_pov_character_id_characters_id_fk" FOREIGN KEY ("pov_character_id") REFERENCES "app"."characters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."stories" ADD CONSTRAINT "stories_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."stories" ADD CONSTRAINT "stories_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "app"."worlds"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."stories" ADD CONSTRAINT "stories_era_id_world_eras_id_fk" FOREIGN KEY ("era_id") REFERENCES "app"."world_eras"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."stories" ADD CONSTRAINT "stories_place_id_world_notes_id_fk" FOREIGN KEY ("place_id") REFERENCES "app"."world_notes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."world_eras" ADD CONSTRAINT "world_eras_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."world_eras" ADD CONSTRAINT "world_eras_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "app"."worlds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."world_events" ADD CONSTRAINT "world_events_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."world_events" ADD CONSTRAINT "world_events_era_id_world_eras_id_fk" FOREIGN KEY ("era_id") REFERENCES "app"."world_eras"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."world_notes" ADD CONSTRAINT "world_notes_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."world_notes" ADD CONSTRAINT "world_notes_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "app"."worlds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."world_notes" ADD CONSTRAINT "world_notes_template_id_note_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "app"."note_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."world_notes" ADD CONSTRAINT "world_notes_parent_id_world_notes_id_fk" FOREIGN KEY ("parent_id") REFERENCES "app"."world_notes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."worlds" ADD CONSTRAINT "worlds_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."writing_days" ADD CONSTRAINT "writing_days_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "characters_world_idx" ON "app"."characters" USING btree ("world_id");--> statement-breakpoint
CREATE INDEX "note_templates_world_idx" ON "app"."note_templates" USING btree ("world_id");--> statement-breakpoint
CREATE UNIQUE INDEX "note_templates_world_key_uq" ON "app"."note_templates" USING btree ("world_id","key") WHERE "app"."note_templates"."key" is not null and "app"."note_templates"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "pages_story_idx" ON "app"."pages" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "stories_world_idx" ON "app"."stories" USING btree ("world_id");--> statement-breakpoint
CREATE INDEX "world_eras_world_idx" ON "app"."world_eras" USING btree ("world_id");--> statement-breakpoint
CREATE INDEX "world_events_era_idx" ON "app"."world_events" USING btree ("era_id");--> statement-breakpoint
CREATE INDEX "world_notes_world_idx" ON "app"."world_notes" USING btree ("world_id");--> statement-breakpoint
CREATE INDEX "world_notes_parent_idx" ON "app"."world_notes" USING btree ("parent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "writing_days_user_day_uq" ON "app"."writing_days" USING btree ("user_id","day_on");
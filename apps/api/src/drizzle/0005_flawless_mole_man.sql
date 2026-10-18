CREATE TYPE "app"."event_kind" AS ENUM('work', 'personal', 'school');--> statement-breakpoint
CREATE TYPE "app"."event_reminder" AS ENUM('none', '10m', '1h', '1d');--> statement-breakpoint
CREATE TYPE "app"."event_repeat" AS ENUM('none', 'daily', 'weekdays', 'weekly', 'monthly', 'yearly');--> statement-breakpoint
CREATE TABLE "app"."events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"title" text NOT NULL,
	"kind" "app"."event_kind" NOT NULL,
	"date" date NOT NULL,
	"all_day" boolean DEFAULT false NOT NULL,
	"start_min" integer,
	"end_min" integer,
	"place" text,
	"project_id" uuid,
	"notes" text,
	"repeat" "app"."event_repeat" DEFAULT 'none' NOT NULL,
	"until" date,
	"skip" date[] DEFAULT '{}' NOT NULL,
	"reminder" "app"."event_reminder" DEFAULT 'none' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."events" ADD CONSTRAINT "events_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."profiles"("id") ON DELETE cascade ON UPDATE no action;
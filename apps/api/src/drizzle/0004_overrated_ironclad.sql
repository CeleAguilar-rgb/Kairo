CREATE TYPE "app"."reminder_repeat" AS ENUM('none', 'daily', 'weekdays');--> statement-breakpoint
CREATE TABLE "app"."reminders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"title" text NOT NULL,
	"remind_at" timestamp with time zone NOT NULL,
	"done_at" timestamp with time zone,
	"snoozed_to" timestamp with time zone,
	"notified_at" timestamp with time zone,
	"repeat" "app"."reminder_repeat" DEFAULT 'none' NOT NULL,
	"spawned_from_id" uuid
);
--> statement-breakpoint
ALTER TABLE "app"."reminders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."reminders" ADD CONSTRAINT "reminders_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."reminders" ADD CONSTRAINT "reminders_spawned_from_id_reminders_id_fk" FOREIGN KEY ("spawned_from_id") REFERENCES "app"."reminders"("id") ON DELETE cascade ON UPDATE no action;
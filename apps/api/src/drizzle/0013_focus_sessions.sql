CREATE TYPE "app"."focus_kind" AS ENUM('work', 'break');--> statement-breakpoint
CREATE TABLE "app"."focus_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"kind" "app"."focus_kind" NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"minutes" integer NOT NULL,
	"task_id" uuid,
	CONSTRAINT "focus_sessions_minutes_range" CHECK ("app"."focus_sessions"."minutes" between 1 and 180)
);
--> statement-breakpoint
ALTER TABLE "app"."focus_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."focus_sessions" ADD CONSTRAINT "focus_sessions_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."focus_sessions" ADD CONSTRAINT "focus_sessions_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "app"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "focus_sessions_user_started_idx" ON "app"."focus_sessions" USING btree ("user_id","started_at");
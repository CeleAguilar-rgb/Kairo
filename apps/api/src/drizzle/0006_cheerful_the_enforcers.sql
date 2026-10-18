CREATE TYPE "app"."goal_area" AS ENUM('work', 'personal', 'school', 'health', 'money');--> statement-breakpoint
CREATE TYPE "app"."goal_kind" AS ENUM('milestones', 'number', 'habit', 'project');--> statement-breakpoint
CREATE TYPE "app"."goal_status" AS ENUM('active', 'done', 'paused');--> statement-breakpoint
CREATE TYPE "app"."journal_tag" AS ENUM('work', 'school', 'projects', 'friends', 'family', 'health', 'writing');--> statement-breakpoint
CREATE TYPE "app"."meal" AS ENUM('breakfast', 'lunch', 'dinner');--> statement-breakpoint
CREATE TYPE "app"."routine_icon" AS ENUM('sun', 'drop', 'pill', 'food', 'cap', 'code', 'pen', 'work', 'moon');--> statement-breakpoint
CREATE TYPE "app"."routine_kind" AS ENUM('habit', 'meal', 'focus', 'free');--> statement-breakpoint
CREATE TABLE "app"."goal_log_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"goal_id" uuid NOT NULL,
	"log_date" date NOT NULL,
	"amount" double precision NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."goal_log_entries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."goal_milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"goal_id" uuid NOT NULL,
	"text" text NOT NULL,
	"done" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."goal_milestones" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"title" text NOT NULL,
	"area" "app"."goal_area" NOT NULL,
	"kind" "app"."goal_kind" NOT NULL,
	"status" "app"."goal_status" DEFAULT 'active' NOT NULL,
	"target" double precision,
	"current" double precision DEFAULT 0 NOT NULL,
	"unit" text DEFAULT '' NOT NULL,
	"block_id" uuid,
	"project_id" uuid,
	"due_on" date,
	"why" text DEFAULT '' NOT NULL,
	"achieved_on" date
);
--> statement-breakpoint
ALTER TABLE "app"."goals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."journal_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"entry_date" date NOT NULL,
	"mood" integer NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"gratitude" text[] DEFAULT '{}' NOT NULL,
	"tags" "app"."journal_tag"[] DEFAULT '{}' NOT NULL,
	"summary" text[] DEFAULT '{}' NOT NULL,
	"saved_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."journal_entries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."meal_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"plan_date" date NOT NULL,
	"meal" "app"."meal" NOT NULL,
	"dish" text NOT NULL,
	"done" boolean DEFAULT false NOT NULL,
	"prep" boolean DEFAULT false NOT NULL,
	"note" text
);
--> statement-breakpoint
ALTER TABLE "app"."meal_plans" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."routine_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"routine_id" uuid NOT NULL,
	"starts_at" time NOT NULL,
	"ends_at" time,
	"title" text NOT NULL,
	"kind" "app"."routine_kind" NOT NULL,
	"icon" "app"."routine_icon" NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"alert" boolean DEFAULT false NOT NULL,
	"nag_minutes" integer DEFAULT 0 NOT NULL,
	"counts_for_report" boolean DEFAULT true NOT NULL,
	"link" text,
	"note" text
);
--> statement-breakpoint
ALTER TABLE "app"."routine_blocks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."routine_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"block_id" uuid NOT NULL,
	"log_date" date NOT NULL,
	"done_at" time NOT NULL,
	"late" boolean NOT NULL,
	"focus_done" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."routine_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."routines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"name" text NOT NULL,
	"days" boolean[] NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."routines" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."goal_log_entries" ADD CONSTRAINT "goal_log_entries_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."goal_log_entries" ADD CONSTRAINT "goal_log_entries_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "app"."goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."goal_milestones" ADD CONSTRAINT "goal_milestones_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."goal_milestones" ADD CONSTRAINT "goal_milestones_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "app"."goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."goals" ADD CONSTRAINT "goals_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."goals" ADD CONSTRAINT "goals_block_id_routine_blocks_id_fk" FOREIGN KEY ("block_id") REFERENCES "app"."routine_blocks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."journal_entries" ADD CONSTRAINT "journal_entries_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."meal_plans" ADD CONSTRAINT "meal_plans_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."routine_blocks" ADD CONSTRAINT "routine_blocks_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."routine_blocks" ADD CONSTRAINT "routine_blocks_routine_id_routines_id_fk" FOREIGN KEY ("routine_id") REFERENCES "app"."routines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."routine_logs" ADD CONSTRAINT "routine_logs_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."routine_logs" ADD CONSTRAINT "routine_logs_block_id_routine_blocks_id_fk" FOREIGN KEY ("block_id") REFERENCES "app"."routine_blocks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."routines" ADD CONSTRAINT "routines_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."profiles"("id") ON DELETE cascade ON UPDATE no action;
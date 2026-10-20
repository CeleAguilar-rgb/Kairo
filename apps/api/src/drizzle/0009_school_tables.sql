CREATE TYPE "app"."subject_color" AS ENUM('lavender', 'ink', 'sand', 'lavender_soft', 'peach');--> statement-breakpoint
CREATE TABLE "app"."school_terms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"name" text NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date NOT NULL,
	"prep_project_id" uuid,
	CONSTRAINT "school_terms_ends_after_start" CHECK ("app"."school_terms"."ends_on" >= "app"."school_terms"."starts_on")
);
--> statement-breakpoint
ALTER TABLE "app"."school_terms" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."subjects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"project_id" uuid NOT NULL,
	"term_id" uuid,
	"teacher" text,
	"color" "app"."subject_color" NOT NULL,
	"midterm_1" numeric(3, 1),
	"midterm_2" numeric(3, 1),
	"final" numeric(3, 1),
	CONSTRAINT "subjects_midterm_1_range" CHECK ("app"."subjects"."midterm_1" is null or "app"."subjects"."midterm_1" between 0 and 10),
	CONSTRAINT "subjects_midterm_2_range" CHECK ("app"."subjects"."midterm_2" is null or "app"."subjects"."midterm_2" between 0 and 10),
	CONSTRAINT "subjects_final_range" CHECK ("app"."subjects"."final" is null or "app"."subjects"."final" between 0 and 10)
);
--> statement-breakpoint
ALTER TABLE "app"."subjects" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."school_terms" ADD CONSTRAINT "school_terms_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."school_terms" ADD CONSTRAINT "school_terms_prep_project_id_projects_id_fk" FOREIGN KEY ("prep_project_id") REFERENCES "app"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."subjects" ADD CONSTRAINT "subjects_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."subjects" ADD CONSTRAINT "subjects_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "app"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."subjects" ADD CONSTRAINT "subjects_term_id_school_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "app"."school_terms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "subjects_project_uq" ON "app"."subjects" USING btree ("project_id");
CREATE TABLE "app"."attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"storage_path" text NOT NULL,
	"mime" text NOT NULL,
	"size_bytes" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."attachments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."attachments" ADD CONSTRAINT "attachments_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."attachments" ADD CONSTRAINT "attachments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "app"."projects"("id") ON DELETE cascade ON UPDATE no action;
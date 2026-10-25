ALTER TABLE "app"."characters" ADD COLUMN "extras" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."characters" ADD COLUMN "url" text;--> statement-breakpoint
ALTER TABLE "app"."world_notes" ADD COLUMN "extras" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."world_notes" ADD COLUMN "url" text;
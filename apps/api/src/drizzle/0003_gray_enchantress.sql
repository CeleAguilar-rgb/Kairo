ALTER TYPE "app"."task_status" ADD VALUE 'review' BEFORE 'done';--> statement-breakpoint
ALTER TABLE "app"."tasks" ADD COLUMN "project_id" uuid;--> statement-breakpoint
ALTER TABLE "app"."tasks" ADD COLUMN "parent_task_id" uuid;--> statement-breakpoint
ALTER TABLE "app"."tasks" ADD CONSTRAINT "tasks_parent_task_id_tasks_id_fk" FOREIGN KEY ("parent_task_id") REFERENCES "app"."tasks"("id") ON DELETE cascade ON UPDATE no action;
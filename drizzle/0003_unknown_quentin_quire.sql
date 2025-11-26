ALTER TABLE "app_tasks" ADD COLUMN "completed_by_id" varchar(255);--> statement-breakpoint
ALTER TABLE "app_tasks" ADD COLUMN "last_edited_by_id" varchar(255);--> statement-breakpoint
ALTER TABLE "app_tasks" ADD COLUMN "last_edited_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "app_tasks" ADD CONSTRAINT "app_tasks_completed_by_id_app_user_id_fk" FOREIGN KEY ("completed_by_id") REFERENCES "public"."app_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_tasks" ADD CONSTRAINT "app_tasks_last_edited_by_id_app_user_id_fk" FOREIGN KEY ("last_edited_by_id") REFERENCES "public"."app_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_completed_by_idx" ON "app_tasks" USING btree ("completed_by_id");--> statement-breakpoint
CREATE INDEX "task_last_edited_by_idx" ON "app_tasks" USING btree ("last_edited_by_id");
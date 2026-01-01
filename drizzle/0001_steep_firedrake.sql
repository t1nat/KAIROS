ALTER TYPE "public"."language" ADD VALUE 'bg' BEFORE 'es';--> statement-breakpoint
ALTER TYPE "public"."org_role" ADD VALUE 'mentor';--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "active_organization_id" integer;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "task_due_reminders_notifications" boolean DEFAULT true NOT NULL;
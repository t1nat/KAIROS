-- Add Bulgarian to language enum and support task-due notification preference

DO $$
BEGIN
  ALTER TYPE "language" ADD VALUE IF NOT EXISTS 'bg';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS "task_due_reminders_notifications" boolean NOT NULL DEFAULT true;

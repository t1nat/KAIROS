DO $$ BEGIN ALTER TABLE "user" ADD COLUMN "reset_pin_hash" varchar(255); EXCEPTION WHEN duplicate_column THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "user" ADD COLUMN "reset_pin_hint" text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "user" ADD COLUMN "reset_pin_failed_attempts" integer DEFAULT 0 NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "user" ADD COLUMN "reset_pin_locked_until" timestamp with time zone; EXCEPTION WHEN duplicate_column THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "user" ADD COLUMN "reset_pin_last_failed_at" timestamp with time zone; EXCEPTION WHEN duplicate_column THEN NULL; END $$;--> statement-breakpoint
ALTER TABLE "sticky_notes" DROP COLUMN IF EXISTS "reset_token";--> statement-breakpoint
ALTER TABLE "sticky_notes" DROP COLUMN IF EXISTS "reset_token_expiry";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN IF EXISTS "password_reset_token";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN IF EXISTS "password_reset_expires";

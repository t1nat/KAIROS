ALTER TABLE "user" ADD COLUMN "reset_pin_hash" varchar(255);--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "reset_pin_hint" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "reset_pin_failed_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "reset_pin_locked_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "reset_pin_last_failed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sticky_notes" DROP COLUMN "reset_token";--> statement-breakpoint
ALTER TABLE "sticky_notes" DROP COLUMN "reset_token_expiry";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "password_reset_token";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "password_reset_expires";
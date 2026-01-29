ALTER TABLE "user"
  DROP COLUMN IF EXISTS "password_reset_token",
  DROP COLUMN IF EXISTS "password_reset_expires",
  ADD COLUMN IF NOT EXISTS "reset_pin_hash" varchar(255),
  ADD COLUMN IF NOT EXISTS "reset_pin_hint" text,
  ADD COLUMN IF NOT EXISTS "reset_pin_failed_attempts" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "reset_pin_locked_until" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "reset_pin_last_failed_at" timestamp with time zone;

ALTER TABLE "sticky_notes"
  DROP COLUMN IF EXISTS "reset_token",
  DROP COLUMN IF EXISTS "reset_token_expiry";
-- Fix column types for reset PIN related fields on the user table
-- This ensures the hint is stored as text and the lockout fields are proper timestamptz

ALTER TABLE "user"
  ALTER COLUMN "reset_pin_hint" TYPE text,
  ALTER COLUMN "reset_pin_locked_until" TYPE timestamp with time zone,
  ALTER COLUMN "reset_pin_last_failed_at" TYPE timestamp with time zone;

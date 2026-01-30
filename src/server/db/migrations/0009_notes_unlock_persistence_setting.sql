ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "notes_keep_unlocked_until_close" boolean DEFAULT false NOT NULL;

ALTER TABLE "sticky_notes" ADD COLUMN "calendar_date" timestamp;--> statement-breakpoint
CREATE INDEX "note_calendar_date_idx" ON "sticky_notes" USING btree ("calendar_date");
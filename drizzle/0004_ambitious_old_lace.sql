CREATE TYPE "public"."region" AS ENUM('sofia', 'plovdiv', 'varna', 'burgas', 'ruse', 'stara_zagora', 'pleven', 'sliven', 'dobrich', 'shumen');--> statement-breakpoint
ALTER TABLE "app_event" ADD COLUMN "region" "region" NOT NULL;--> statement-breakpoint
CREATE INDEX "event_region_idx" ON "app_event" USING btree ("region");
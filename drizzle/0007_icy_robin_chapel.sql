CREATE TYPE "public"."project_status" AS ENUM('active', 'archived');--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "status" "project_status" DEFAULT 'active' NOT NULL;
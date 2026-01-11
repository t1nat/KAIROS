-- Add status column to projects
ALTER TABLE "projects" ADD COLUMN "status" varchar DEFAULT 'active' NOT NULL;

-- Create enum type for project status
CREATE TYPE "project_status" AS ENUM ('active', 'archived');

-- Update status column to use enum
ALTER TABLE "projects" ALTER COLUMN "status" TYPE "project_status" USING "status"::"project_status";

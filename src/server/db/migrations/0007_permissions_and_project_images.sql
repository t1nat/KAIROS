-- Add permissions columns to organization_members
ALTER TABLE "organization_members" ADD COLUMN "can_add_members" boolean DEFAULT false NOT NULL;
ALTER TABLE "organization_members" ADD COLUMN "can_assign_tasks" boolean DEFAULT false NOT NULL;

-- Add image_url column to projects
ALTER TABLE "projects" ADD COLUMN "image_url" varchar(512);

-- Update existing admin members to have all permissions
UPDATE "organization_members" 
SET "can_add_members" = true, "can_assign_tasks" = true 
WHERE "role" = 'admin';

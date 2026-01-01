ALTER TYPE "public"."org_role" ADD VALUE IF NOT EXISTS 'mentor';--> statement-breakpoint

ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "active_organization_id" integer;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "user" ADD CONSTRAINT "user_active_organization_id_organizations_id_fk" FOREIGN KEY ("active_organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "user_active_organization_id_idx" ON "user" ("active_organization_id");--> statement-breakpoint

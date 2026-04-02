DO $$ BEGIN CREATE TYPE "public"."agent_notes_vault_draft_status" AS ENUM('draft', 'confirmed', 'applied', 'expired'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TYPE "public"."notification_type" ADD VALUE 'like'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TYPE "public"."notification_type" ADD VALUE 'comment'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TYPE "public"."notification_type" ADD VALUE 'reply'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TYPE "public"."org_role" ADD VALUE 'member' BEFORE 'worker'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TYPE "public"."org_role" ADD VALUE 'guest' BEFORE 'worker'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agent_notes_vault_applies" (
	"id" serial PRIMARY KEY NOT NULL,
	"draft_id" varchar(80) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"plan_hash" varchar(64) NOT NULL,
	"result_json" text NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agent_notes_vault_drafts" (
	"id" varchar(80) PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"plan_json" text NOT NULL,
	"plan_hash" varchar(64) NOT NULL,
	"status" "agent_notes_vault_draft_status" DEFAULT 'draft' NOT NULL,
	"confirmation_token" text,
	"confirmed_at" timestamp with time zone,
	"applied_at" timestamp with time zone,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "organization_invites" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"email" varchar(255) NOT NULL,
	"role" "org_role" DEFAULT 'member' NOT NULL,
	"invited_by_id" varchar(255) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "organization_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"can_add_members" boolean DEFAULT false NOT NULL,
	"can_assign_tasks" boolean DEFAULT false NOT NULL,
	"can_create_projects" boolean DEFAULT false NOT NULL,
	"can_delete_tasks" boolean DEFAULT false NOT NULL,
	"can_kick_members" boolean DEFAULT false NOT NULL,
	"can_manage_roles" boolean DEFAULT false NOT NULL,
	"can_edit_projects" boolean DEFAULT false NOT NULL,
	"can_view_analytics" boolean DEFAULT false NOT NULL,
	"is_template" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
DROP INDEX IF EXISTS "t_user_id_idx";--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "event_rsvp" ADD COLUMN "reminder_minutes_before" integer; EXCEPTION WHEN duplicate_column THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "event_rsvp" ADD COLUMN "reminder_sent" boolean DEFAULT false NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "organization_members" ADD COLUMN "can_create_projects" boolean DEFAULT false NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "organization_members" ADD COLUMN "can_delete_tasks" boolean DEFAULT false NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "organization_members" ADD COLUMN "can_kick_members" boolean DEFAULT false NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "organization_members" ADD COLUMN "can_manage_roles" boolean DEFAULT false NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "organization_members" ADD COLUMN "can_edit_projects" boolean DEFAULT false NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "organization_members" ADD COLUMN "can_view_analytics" boolean DEFAULT false NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "agent_notes_vault_applies" ADD CONSTRAINT "agent_notes_vault_applies_draft_id_agent_notes_vault_drafts_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."agent_notes_vault_drafts"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "agent_notes_vault_applies" ADD CONSTRAINT "agent_notes_vault_applies_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "agent_notes_vault_drafts" ADD CONSTRAINT "agent_notes_vault_drafts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "organization_invites" ADD CONSTRAINT "organization_invites_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "organization_invites" ADD CONSTRAINT "organization_invites_invited_by_id_user_id_fk" FOREIGN KEY ("invited_by_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "organization_roles" ADD CONSTRAINT "organization_roles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "a3_apply_draft_idx" ON "agent_notes_vault_applies" USING btree ("draft_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "a3_apply_user_idx" ON "agent_notes_vault_applies" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "a3_apply_plan_hash_idx" ON "agent_notes_vault_applies" USING btree ("plan_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "a3_draft_user_idx" ON "agent_notes_vault_drafts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "a3_draft_status_idx" ON "agent_notes_vault_drafts" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "a3_draft_plan_hash_idx" ON "agent_notes_vault_drafts" USING btree ("plan_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "org_invite_org_idx" ON "organization_invites" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "org_invite_email_idx" ON "organization_invites" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "org_role_org_idx" ON "organization_roles" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "session_user_idx" ON "session" USING btree ("userId");
CREATE TYPE "public"."date_format" AS ENUM('MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD');--> statement-breakpoint
CREATE TYPE "public"."language" AS ENUM('en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh', 'ar');--> statement-breakpoint
CREATE TYPE "public"."org_role" AS ENUM('admin', 'worker');--> statement-breakpoint
CREATE TYPE "public"."theme" AS ENUM('light', 'dark', 'system');--> statement-breakpoint
CREATE TYPE "public"."usage_mode" AS ENUM('personal', 'organization');--> statement-breakpoint
CREATE TABLE "app_document_collaborators" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" integer NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"last_edit" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"color" varchar(7) DEFAULT '#3B82F6' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_document_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" integer NOT NULL,
	"content" text NOT NULL,
	"annotations" json,
	"created_by_id" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(256) NOT NULL,
	"content" text NOT NULL,
	"password_hash" varchar(256),
	"organization_id" integer,
	"created_by_id" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"annotations" json,
	"imported_from" varchar(256),
	"imported_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "app_organization_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"role" "org_role" NOT NULL,
	"joined_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_organizations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(256) NOT NULL,
	"access_code" varchar(14) NOT NULL,
	"created_by_id" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "app_organizations_access_code_unique" UNIQUE("access_code")
);
--> statement-breakpoint
ALTER TABLE "app_projects" ADD COLUMN "organization_id" integer;--> statement-breakpoint
ALTER TABLE "app_user" ADD COLUMN "usage_mode" "usage_mode";--> statement-breakpoint
ALTER TABLE "app_user" ADD COLUMN "password_reset_token" varchar(255);--> statement-breakpoint
ALTER TABLE "app_user" ADD COLUMN "password_reset_expires" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "app_user" ADD COLUMN "bio" text;--> statement-breakpoint
ALTER TABLE "app_user" ADD COLUMN "email_notifications" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "app_user" ADD COLUMN "project_updates_notifications" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "app_user" ADD COLUMN "event_reminders_notifications" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "app_user" ADD COLUMN "marketing_emails_notifications" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "app_user" ADD COLUMN "language" "language" DEFAULT 'en' NOT NULL;--> statement-breakpoint
ALTER TABLE "app_user" ADD COLUMN "timezone" varchar(100) DEFAULT 'UTC' NOT NULL;--> statement-breakpoint
ALTER TABLE "app_user" ADD COLUMN "date_format" date_format DEFAULT 'MM/DD/YYYY' NOT NULL;--> statement-breakpoint
ALTER TABLE "app_user" ADD COLUMN "theme" "theme" DEFAULT 'light' NOT NULL;--> statement-breakpoint
ALTER TABLE "app_user" ADD COLUMN "accent_color" varchar(20) DEFAULT 'indigo' NOT NULL;--> statement-breakpoint
ALTER TABLE "app_user" ADD COLUMN "profile_visibility" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "app_user" ADD COLUMN "show_online_status" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "app_user" ADD COLUMN "activity_tracking" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "app_user" ADD COLUMN "data_collection" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "app_user" ADD COLUMN "two_factor_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "app_user" ADD COLUMN "two_factor_secret" varchar(255);--> statement-breakpoint
ALTER TABLE "app_user" ADD COLUMN "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL;--> statement-breakpoint
ALTER TABLE "app_user" ADD COLUMN "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL;--> statement-breakpoint
ALTER TABLE "app_document_collaborators" ADD CONSTRAINT "app_document_collaborators_document_id_app_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."app_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_document_collaborators" ADD CONSTRAINT "app_document_collaborators_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_document_versions" ADD CONSTRAINT "app_document_versions_document_id_app_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."app_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_document_versions" ADD CONSTRAINT "app_document_versions_created_by_id_app_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_documents" ADD CONSTRAINT "app_documents_organization_id_app_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."app_organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_documents" ADD CONSTRAINT "app_documents_created_by_id_app_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_organization_members" ADD CONSTRAINT "app_organization_members_organization_id_app_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."app_organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_organization_members" ADD CONSTRAINT "app_organization_members_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_organizations" ADD CONSTRAINT "app_organizations_created_by_id_app_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "doc_collab_doc_idx" ON "app_document_collaborators" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "doc_collab_user_idx" ON "app_document_collaborators" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "doc_version_doc_idx" ON "app_document_versions" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "doc_version_created_idx" ON "app_document_versions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "doc_created_by_idx" ON "app_documents" USING btree ("created_by_id");--> statement-breakpoint
CREATE INDEX "doc_org_idx" ON "app_documents" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "org_member_org_idx" ON "app_organization_members" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "org_member_user_idx" ON "app_organization_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "org_created_by_idx" ON "app_organizations" USING btree ("created_by_id");--> statement-breakpoint
CREATE INDEX "org_access_code_idx" ON "app_organizations" USING btree ("access_code");--> statement-breakpoint
ALTER TABLE "app_projects" ADD CONSTRAINT "app_projects_organization_id_app_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."app_organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_org_idx" ON "app_projects" USING btree ("organization_id");
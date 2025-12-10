CREATE TABLE "event_comment" (
	"id" serial PRIMARY KEY NOT NULL,
	"text" text NOT NULL,
	"image_url" text,
	"event_id" integer NOT NULL,
	"createdById" varchar(255) NOT NULL,
	"createdAt" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_like" (
	"event_id" integer NOT NULL,
	"createdById" varchar(255) NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	CONSTRAINT "event_like_event_id_createdById_pk" PRIMARY KEY("event_id","createdById")
);
--> statement-breakpoint
CREATE TABLE "event_rsvp" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"status" "rsvp_status" NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(256) NOT NULL,
	"description" text NOT NULL,
	"image_url" text,
	"event_date" timestamp with time zone NOT NULL,
	"region" "region" NOT NULL,
	"createdById" varchar(255) NOT NULL,
	"enable_rsvp" boolean DEFAULT false NOT NULL,
	"send_reminders" boolean DEFAULT false NOT NULL,
	"reminder_sent" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" varchar(256) NOT NULL,
	"message" text NOT NULL,
	"link" varchar(512),
	"read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"role" "org_role" NOT NULL,
	"joined_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(256) NOT NULL,
	"access_code" varchar(14) NOT NULL,
	"created_by_id" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "organizations_access_code_unique" UNIQUE("access_code")
);
--> statement-breakpoint
CREATE TABLE "project_collaborators" (
	"project_id" integer NOT NULL,
	"collaboratorId" varchar(255) NOT NULL,
	"permission" "permission" NOT NULL,
	"joined_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "project_collaborators_project_id_collaboratorId_pk" PRIMARY KEY("project_id","collaboratorId")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(256) NOT NULL,
	"description" text,
	"createdById" varchar(255) NOT NULL,
	"share_status" "share_status" DEFAULT 'private' NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"organization_id" integer
);
--> statement-breakpoint
CREATE TABLE "session" (
	"sessionToken" varchar(255) PRIMARY KEY NOT NULL,
	"userId" varchar(255) NOT NULL,
	"expires" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sticky_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"createdById" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"password_hash" varchar(256),
	"password_salt" varchar(256),
	"reset_token" text,
	"reset_token_expiry" timestamp with time zone,
	"share_status" "share_status" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_activity_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"userId" varchar(255) NOT NULL,
	"action" varchar(100) NOT NULL,
	"old_value" text,
	"new_value" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"task_id" integer NOT NULL,
	"createdById" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(256) NOT NULL,
	"description" text,
	"project_id" integer NOT NULL,
	"assignedToId" varchar(255),
	"status" "task_status" DEFAULT 'pending' NOT NULL,
	"priority" "task_priority" DEFAULT 'medium' NOT NULL,
	"due_date" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"completed_by_id" varchar(255),
	"createdById" varchar(255) NOT NULL,
	"last_edited_by_id" varchar(255),
	"last_edited_at" timestamp with time zone,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"name" varchar(255),
	"email" varchar(255) NOT NULL,
	"emailVerified" timestamp with time zone,
	"image" varchar(255),
	"usage_mode" "usage_mode",
	"password" varchar(255),
	"password_reset_token" varchar(255),
	"password_reset_expires" timestamp with time zone,
	"bio" text,
	"email_notifications" boolean DEFAULT true NOT NULL,
	"project_updates_notifications" boolean DEFAULT true NOT NULL,
	"event_reminders_notifications" boolean DEFAULT false NOT NULL,
	"marketing_emails_notifications" boolean DEFAULT false NOT NULL,
	"language" "language" DEFAULT 'en' NOT NULL,
	"timezone" varchar(100) DEFAULT 'UTC' NOT NULL,
	"date_format" date_format DEFAULT 'MM/DD/YYYY' NOT NULL,
	"theme" "theme" DEFAULT 'light' NOT NULL,
	"accent_color" varchar(20) DEFAULT 'indigo' NOT NULL,
	"profile_visibility" boolean DEFAULT true NOT NULL,
	"show_online_status" boolean DEFAULT true NOT NULL,
	"activity_tracking" boolean DEFAULT false NOT NULL,
	"data_collection" boolean DEFAULT false NOT NULL,
	"two_factor_enabled" boolean DEFAULT false NOT NULL,
	"two_factor_secret" varchar(255),
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification_token" (
	"identifier" varchar(255) NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires" timestamp with time zone NOT NULL,
	CONSTRAINT "verification_token_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "app_event_comment" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app_event_like" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app_event_rsvp" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app_event" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app_notifications" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app_organization_members" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app_organizations" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app_project_collaborators" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app_projects" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app_session" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app_sticky_notes" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app_task_activity_log" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app_task_comments" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app_tasks" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app_user" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app_verification_token" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "app_event_comment" CASCADE;--> statement-breakpoint
DROP TABLE "app_event_like" CASCADE;--> statement-breakpoint
DROP TABLE "app_event_rsvp" CASCADE;--> statement-breakpoint
DROP TABLE "app_event" CASCADE;--> statement-breakpoint
DROP TABLE "app_notifications" CASCADE;--> statement-breakpoint
DROP TABLE "app_organization_members" CASCADE;--> statement-breakpoint
DROP TABLE "app_organizations" CASCADE;--> statement-breakpoint
DROP TABLE "app_project_collaborators" CASCADE;--> statement-breakpoint
DROP TABLE "app_projects" CASCADE;--> statement-breakpoint
DROP TABLE "app_session" CASCADE;--> statement-breakpoint
DROP TABLE "app_sticky_notes" CASCADE;--> statement-breakpoint
DROP TABLE "app_task_activity_log" CASCADE;--> statement-breakpoint
DROP TABLE "app_task_comments" CASCADE;--> statement-breakpoint
DROP TABLE "app_tasks" CASCADE;--> statement-breakpoint
DROP TABLE "app_user" CASCADE;--> statement-breakpoint
DROP TABLE "app_verification_token" CASCADE;--> statement-breakpoint
ALTER TABLE "app_account" RENAME TO "account";--> statement-breakpoint
ALTER TABLE "account" DROP CONSTRAINT "app_account_userId_app_user_id_fk";
--> statement-breakpoint
ALTER TABLE "account" DROP CONSTRAINT "app_account_provider_providerAccountId_pk";--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_provider_providerAccountId_pk" PRIMARY KEY("provider","providerAccountId");--> statement-breakpoint
ALTER TABLE "event_comment" ADD CONSTRAINT "event_comment_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_comment" ADD CONSTRAINT "event_comment_createdById_user_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_like" ADD CONSTRAINT "event_like_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_like" ADD CONSTRAINT "event_like_createdById_user_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_rsvp" ADD CONSTRAINT "event_rsvp_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_rsvp" ADD CONSTRAINT "event_rsvp_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_createdById_user_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_collaborators" ADD CONSTRAINT "project_collaborators_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_collaborators" ADD CONSTRAINT "project_collaborators_collaboratorId_user_id_fk" FOREIGN KEY ("collaboratorId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_createdById_user_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sticky_notes" ADD CONSTRAINT "sticky_notes_createdById_user_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_activity_log" ADD CONSTRAINT "task_activity_log_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_activity_log" ADD CONSTRAINT "task_activity_log_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_createdById_user_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignedToId_user_id_fk" FOREIGN KEY ("assignedToId") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_completed_by_id_user_id_fk" FOREIGN KEY ("completed_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_createdById_user_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_last_edited_by_id_user_id_fk" FOREIGN KEY ("last_edited_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "comment_event_id_idx" ON "event_comment" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "comment_created_by_idx" ON "event_comment" USING btree ("createdById");--> statement-breakpoint
CREATE INDEX "like_event_id_idx" ON "event_like" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "rsvp_event_idx" ON "event_rsvp" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "rsvp_user_idx" ON "event_rsvp" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "rsvp_unique" ON "event_rsvp" USING btree ("event_id","user_id");--> statement-breakpoint
CREATE INDEX "event_created_by_idx" ON "event" USING btree ("createdById");--> statement-breakpoint
CREATE INDEX "event_date_idx" ON "event" USING btree ("event_date");--> statement-breakpoint
CREATE INDEX "event_region_idx" ON "event" USING btree ("region");--> statement-breakpoint
CREATE INDEX "notification_user_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notification_read_idx" ON "notifications" USING btree ("read");--> statement-breakpoint
CREATE INDEX "notification_created_idx" ON "notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "org_member_org_idx" ON "organization_members" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "org_member_user_idx" ON "organization_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "org_created_by_idx" ON "organizations" USING btree ("created_by_id");--> statement-breakpoint
CREATE INDEX "org_access_code_idx" ON "organizations" USING btree ("access_code");--> statement-breakpoint
CREATE INDEX "project_collaborator_user_idx" ON "project_collaborators" USING btree ("collaboratorId");--> statement-breakpoint
CREATE INDEX "project_created_by_idx" ON "projects" USING btree ("createdById");--> statement-breakpoint
CREATE INDEX "project_org_idx" ON "projects" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "t_user_id_idx" ON "session" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "note_created_by_idx" ON "sticky_notes" USING btree ("createdById");--> statement-breakpoint
CREATE INDEX "activity_task_idx" ON "task_activity_log" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "activity_user_idx" ON "task_activity_log" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "task_comment_task_idx" ON "task_comments" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "task_comment_user_idx" ON "task_comments" USING btree ("createdById");--> statement-breakpoint
CREATE INDEX "task_project_idx" ON "tasks" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "task_assigned_to_idx" ON "tasks" USING btree ("assignedToId");--> statement-breakpoint
CREATE INDEX "task_created_by_idx" ON "tasks" USING btree ("createdById");--> statement-breakpoint
CREATE INDEX "task_completed_by_idx" ON "tasks" USING btree ("completed_by_id");--> statement-breakpoint
CREATE INDEX "task_last_edited_by_idx" ON "tasks" USING btree ("last_edited_by_id");--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
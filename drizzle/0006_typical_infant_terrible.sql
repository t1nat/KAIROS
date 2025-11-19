CREATE TYPE "public"."task_priority" AS ENUM('low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('pending', 'in_progress', 'completed', 'blocked');--> statement-breakpoint
CREATE TABLE "app_project_collaborators" (
	"project_id" integer NOT NULL,
	"collaboratorId" varchar(255) NOT NULL,
	"permission" "permission" NOT NULL,
	"joined_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "app_project_collaborators_project_id_collaboratorId_pk" PRIMARY KEY("project_id","collaboratorId")
);
--> statement-breakpoint
CREATE TABLE "app_projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(256) NOT NULL,
	"description" text,
	"createdById" varchar(255) NOT NULL,
	"share_status" "share_status" DEFAULT 'private' NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_task_activity_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"userId" varchar(255) NOT NULL,
	"action" varchar(100) NOT NULL,
	"old_value" text,
	"new_value" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_task_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"task_id" integer NOT NULL,
	"createdById" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(256) NOT NULL,
	"description" text,
	"project_id" integer NOT NULL,
	"assignedToId" varchar(255),
	"status" "task_status" DEFAULT 'pending' NOT NULL,
	"priority" "task_priority" DEFAULT 'medium' NOT NULL,
	"due_date" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"createdById" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app_project_collaborators" ADD CONSTRAINT "app_project_collaborators_project_id_app_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."app_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_project_collaborators" ADD CONSTRAINT "app_project_collaborators_collaboratorId_app_user_id_fk" FOREIGN KEY ("collaboratorId") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_projects" ADD CONSTRAINT "app_projects_createdById_app_user_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_task_activity_log" ADD CONSTRAINT "app_task_activity_log_task_id_app_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."app_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_task_activity_log" ADD CONSTRAINT "app_task_activity_log_userId_app_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_task_comments" ADD CONSTRAINT "app_task_comments_task_id_app_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."app_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_task_comments" ADD CONSTRAINT "app_task_comments_createdById_app_user_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_tasks" ADD CONSTRAINT "app_tasks_project_id_app_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."app_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_tasks" ADD CONSTRAINT "app_tasks_assignedToId_app_user_id_fk" FOREIGN KEY ("assignedToId") REFERENCES "public"."app_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_tasks" ADD CONSTRAINT "app_tasks_createdById_app_user_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_collaborator_user_idx" ON "app_project_collaborators" USING btree ("collaboratorId");--> statement-breakpoint
CREATE INDEX "project_created_by_idx" ON "app_projects" USING btree ("createdById");--> statement-breakpoint
CREATE INDEX "activity_task_idx" ON "app_task_activity_log" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "activity_user_idx" ON "app_task_activity_log" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "task_comment_task_idx" ON "app_task_comments" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "task_comment_user_idx" ON "app_task_comments" USING btree ("createdById");--> statement-breakpoint
CREATE INDEX "task_project_idx" ON "app_tasks" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "task_assigned_to_idx" ON "app_tasks" USING btree ("assignedToId");--> statement-breakpoint
CREATE INDEX "task_created_by_idx" ON "app_tasks" USING btree ("createdById");
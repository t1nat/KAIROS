CREATE TYPE "public"."agent_task_planner_draft_status" AS ENUM('draft', 'confirmed', 'applied', 'expired');--> statement-breakpoint
CREATE TABLE "agent_task_planner_applies" (
	"id" serial PRIMARY KEY NOT NULL,
	"draft_id" varchar(80) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"project_id" integer NOT NULL,
	"plan_hash" varchar(64) NOT NULL,
	"result_json" text NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_task_planner_drafts" (
	"id" varchar(80) PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"project_id" integer NOT NULL,
	"message" text NOT NULL,
	"plan_json" text NOT NULL,
	"plan_hash" varchar(64) NOT NULL,
	"status" "agent_task_planner_draft_status" DEFAULT 'draft' NOT NULL,
	"confirmation_token" text,
	"confirmed_at" timestamp with time zone,
	"applied_at" timestamp with time zone,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "client_request_id" varchar(128);--> statement-breakpoint
ALTER TABLE "agent_task_planner_applies" ADD CONSTRAINT "agent_task_planner_applies_draft_id_agent_task_planner_drafts_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."agent_task_planner_drafts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_task_planner_applies" ADD CONSTRAINT "agent_task_planner_applies_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_task_planner_applies" ADD CONSTRAINT "agent_task_planner_applies_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_task_planner_drafts" ADD CONSTRAINT "agent_task_planner_drafts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_task_planner_drafts" ADD CONSTRAINT "agent_task_planner_drafts_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "a2_apply_draft_idx" ON "agent_task_planner_applies" USING btree ("draft_id");--> statement-breakpoint
CREATE INDEX "a2_apply_user_idx" ON "agent_task_planner_applies" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "a2_apply_project_idx" ON "agent_task_planner_applies" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "a2_apply_plan_hash_idx" ON "agent_task_planner_applies" USING btree ("plan_hash");--> statement-breakpoint
CREATE INDEX "a2_draft_user_idx" ON "agent_task_planner_drafts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "a2_draft_project_idx" ON "agent_task_planner_drafts" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "a2_draft_status_idx" ON "agent_task_planner_drafts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "a2_draft_plan_hash_idx" ON "agent_task_planner_drafts" USING btree ("plan_hash");--> statement-breakpoint
CREATE INDEX "task_client_request_id_idx" ON "tasks" USING btree ("client_request_id");
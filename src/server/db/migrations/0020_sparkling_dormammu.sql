CREATE TABLE "crm_accounts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "crm_accounts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"organization_id" integer NOT NULL,
	"name" varchar(256) NOT NULL,
	"domain" varchar(256),
	"industry" varchar(128),
	"size_band" varchar(64),
	"revenue_band" varchar(64),
	"owner_user_id" varchar(255) NOT NULL,
	"lifecycle_stage" varchar(32) DEFAULT 'prospect',
	"source" varchar(32) DEFAULT 'manual',
	"tags" jsonb,
	"last_activity_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_activities" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "crm_activities_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"organization_id" integer NOT NULL,
	"type" varchar(32) NOT NULL,
	"occurred_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"created_by_user_id" varchar(255) NOT NULL,
	"assigned_to_user_id" varchar(255),
	"account_id" integer,
	"contact_id" integer,
	"deal_id" integer,
	"lead_id" integer,
	"subject" varchar(256),
	"body" varchar(8000),
	"external_ref" varchar(256),
	"metadata" jsonb,
	"visibility" varchar(32) DEFAULT 'org' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_audit_log" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "crm_audit_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"organization_id" integer NOT NULL,
	"entity_type" varchar(32) NOT NULL,
	"entity_id" integer NOT NULL,
	"action" varchar(32) NOT NULL,
	"field" varchar(128),
	"old_value" varchar(2048),
	"new_value" varchar(2048),
	"actor_user_id" varchar(255) NOT NULL,
	"actor_type" varchar(32) DEFAULT 'human' NOT NULL,
	"request_id" varchar(128),
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_contacts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "crm_contacts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"organization_id" integer NOT NULL,
	"account_id" integer,
	"first_name" varchar(128),
	"last_name" varchar(128),
	"title" varchar(128),
	"department" varchar(128),
	"email" varchar(320),
	"phone" varchar(64),
	"linkedin_url" varchar(512),
	"owner_user_id" varchar(255) NOT NULL,
	"status" varchar(32) DEFAULT 'active',
	"last_activity_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_deals" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "crm_deals_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"organization_id" integer NOT NULL,
	"account_id" integer NOT NULL,
	"primary_contact_id" integer,
	"name" varchar(256) NOT NULL,
	"owner_user_id" varchar(255) NOT NULL,
	"pipeline_id" integer NOT NULL,
	"stage_id" integer NOT NULL,
	"forecast_category" varchar(32) DEFAULT 'pipeline' NOT NULL,
	"amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"close_date" date,
	"next_activity_at" timestamp,
	"last_stage_changed_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"last_activity_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"closed_lost_reason" varchar(512),
	"competitor" varchar(256)
);
--> statement-breakpoint
CREATE TABLE "crm_leads" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "crm_leads_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"organization_id" integer NOT NULL,
	"owner_user_id" varchar(255),
	"full_name" varchar(256),
	"email" varchar(320),
	"phone" varchar(64),
	"company_name" varchar(256),
	"company_domain" varchar(256),
	"source" varchar(32) DEFAULT 'manual',
	"status" varchar(32) DEFAULT 'new' NOT NULL,
	"disqualify_reason" varchar(512),
	"score" integer,
	"last_touched_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"converted_at" timestamp,
	"converted_account_id" integer,
	"converted_contact_id" integer,
	"converted_deal_id" integer
);
--> statement-breakpoint
CREATE TABLE "crm_pipelines" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "crm_pipelines_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"organization_id" integer NOT NULL,
	"name" varchar(128) NOT NULL,
	"type" varchar(32) DEFAULT 'new_biz' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_stages" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "crm_stages_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"pipeline_id" integer NOT NULL,
	"name" varchar(128) NOT NULL,
	"order" integer NOT NULL,
	"probability_bps" integer DEFAULT 0 NOT NULL,
	"is_closed_won" boolean DEFAULT false NOT NULL,
	"is_closed_lost" boolean DEFAULT false NOT NULL,
	"exit_criteria" varchar(1024),
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "crm_accounts" ADD CONSTRAINT "crm_accounts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_accounts" ADD CONSTRAINT "crm_accounts_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_assigned_to_user_id_user_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_account_id_crm_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."crm_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_contact_id_crm_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."crm_contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_deal_id_crm_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."crm_deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_lead_id_crm_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."crm_leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_audit_log" ADD CONSTRAINT "crm_audit_log_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_audit_log" ADD CONSTRAINT "crm_audit_log_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_contacts" ADD CONSTRAINT "crm_contacts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_contacts" ADD CONSTRAINT "crm_contacts_account_id_crm_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."crm_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_contacts" ADD CONSTRAINT "crm_contacts_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_deals" ADD CONSTRAINT "crm_deals_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_deals" ADD CONSTRAINT "crm_deals_account_id_crm_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."crm_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_deals" ADD CONSTRAINT "crm_deals_primary_contact_id_crm_contacts_id_fk" FOREIGN KEY ("primary_contact_id") REFERENCES "public"."crm_contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_deals" ADD CONSTRAINT "crm_deals_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_deals" ADD CONSTRAINT "crm_deals_pipeline_id_crm_pipelines_id_fk" FOREIGN KEY ("pipeline_id") REFERENCES "public"."crm_pipelines"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_deals" ADD CONSTRAINT "crm_deals_stage_id_crm_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."crm_stages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_leads" ADD CONSTRAINT "crm_leads_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_leads" ADD CONSTRAINT "crm_leads_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_leads" ADD CONSTRAINT "crm_leads_converted_account_id_crm_accounts_id_fk" FOREIGN KEY ("converted_account_id") REFERENCES "public"."crm_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_leads" ADD CONSTRAINT "crm_leads_converted_contact_id_crm_contacts_id_fk" FOREIGN KEY ("converted_contact_id") REFERENCES "public"."crm_contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_pipelines" ADD CONSTRAINT "crm_pipelines_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_stages" ADD CONSTRAINT "crm_stages_pipeline_id_crm_pipelines_id_fk" FOREIGN KEY ("pipeline_id") REFERENCES "public"."crm_pipelines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "crm_accounts_org_name_idx" ON "crm_accounts" USING btree ("organization_id","name");--> statement-breakpoint
CREATE INDEX "crm_accounts_org_domain_idx" ON "crm_accounts" USING btree ("organization_id","domain");--> statement-breakpoint
CREATE INDEX "crm_accounts_org_owner_idx" ON "crm_accounts" USING btree ("organization_id","owner_user_id");--> statement-breakpoint
CREATE INDEX "crm_accounts_last_activity_idx" ON "crm_accounts" USING btree ("last_activity_at");--> statement-breakpoint
CREATE INDEX "crm_activities_org_occurred_idx" ON "crm_activities" USING btree ("organization_id","occurred_at");--> statement-breakpoint
CREATE INDEX "crm_activities_deal_occurred_idx" ON "crm_activities" USING btree ("deal_id","occurred_at");--> statement-breakpoint
CREATE INDEX "crm_activities_account_occurred_idx" ON "crm_activities" USING btree ("account_id","occurred_at");--> statement-breakpoint
CREATE INDEX "crm_activities_contact_occurred_idx" ON "crm_activities" USING btree ("contact_id","occurred_at");--> statement-breakpoint
CREATE INDEX "crm_activities_lead_occurred_idx" ON "crm_activities" USING btree ("lead_id","occurred_at");--> statement-breakpoint
CREATE INDEX "crm_activities_creator_occurred_idx" ON "crm_activities" USING btree ("created_by_user_id","occurred_at");--> statement-breakpoint
CREATE INDEX "crm_audit_org_entity_created_idx" ON "crm_audit_log" USING btree ("organization_id","entity_type","entity_id","created_at");--> statement-breakpoint
CREATE INDEX "crm_audit_actor_created_idx" ON "crm_audit_log" USING btree ("actor_user_id","created_at");--> statement-breakpoint
CREATE INDEX "crm_contacts_org_account_idx" ON "crm_contacts" USING btree ("organization_id","account_id");--> statement-breakpoint
CREATE INDEX "crm_contacts_org_email_idx" ON "crm_contacts" USING btree ("organization_id","email");--> statement-breakpoint
CREATE INDEX "crm_contacts_org_owner_idx" ON "crm_contacts" USING btree ("organization_id","owner_user_id");--> statement-breakpoint
CREATE INDEX "crm_contacts_last_activity_idx" ON "crm_contacts" USING btree ("last_activity_at");--> statement-breakpoint
CREATE INDEX "crm_deals_org_owner_idx" ON "crm_deals" USING btree ("organization_id","owner_user_id");--> statement-breakpoint
CREATE INDEX "crm_deals_org_pipeline_stage_idx" ON "crm_deals" USING btree ("organization_id","pipeline_id","stage_id");--> statement-breakpoint
CREATE INDEX "crm_deals_org_close_date_idx" ON "crm_deals" USING btree ("organization_id","close_date");--> statement-breakpoint
CREATE INDEX "crm_deals_org_next_activity_idx" ON "crm_deals" USING btree ("organization_id","next_activity_at");--> statement-breakpoint
CREATE INDEX "crm_deals_account_idx" ON "crm_deals" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "crm_deals_last_activity_idx" ON "crm_deals" USING btree ("last_activity_at");--> statement-breakpoint
CREATE INDEX "crm_leads_org_status_updated_idx" ON "crm_leads" USING btree ("organization_id","status","updated_at");--> statement-breakpoint
CREATE INDEX "crm_leads_org_owner_status_idx" ON "crm_leads" USING btree ("organization_id","owner_user_id","status");--> statement-breakpoint
CREATE INDEX "crm_leads_org_email_idx" ON "crm_leads" USING btree ("organization_id","email");--> statement-breakpoint
CREATE INDEX "crm_pipelines_org_default_idx" ON "crm_pipelines" USING btree ("organization_id","is_default");--> statement-breakpoint
CREATE UNIQUE INDEX "crm_pipelines_org_name_uq" ON "crm_pipelines" USING btree ("organization_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "crm_stages_pipeline_order_uq" ON "crm_stages" USING btree ("pipeline_id","order");--> statement-breakpoint
CREATE INDEX "crm_stages_pipeline_idx" ON "crm_stages" USING btree ("pipeline_id");
CREATE TABLE "app_event_comment" (
	"id" serial PRIMARY KEY NOT NULL,
	"text" text NOT NULL,
	"event_id" integer NOT NULL,
	"createdById" varchar(255) NOT NULL,
	"createdAt" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_event_like" (
	"event_id" integer NOT NULL,
	"createdById" varchar(255) NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	CONSTRAINT "app_event_like_event_id_createdById_pk" PRIMARY KEY("event_id","createdById")
);
--> statement-breakpoint
CREATE TABLE "app_event" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(256) NOT NULL,
	"description" text NOT NULL,
	"event_date" timestamp with time zone NOT NULL,
	"createdById" varchar(255) NOT NULL,
	"createdAt" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app_event_comment" ADD CONSTRAINT "app_event_comment_event_id_app_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."app_event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_event_comment" ADD CONSTRAINT "app_event_comment_createdById_app_user_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_event_like" ADD CONSTRAINT "app_event_like_event_id_app_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."app_event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_event_like" ADD CONSTRAINT "app_event_like_createdById_app_user_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_event" ADD CONSTRAINT "app_event_createdById_app_user_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "comment_event_id_idx" ON "app_event_comment" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "comment_created_by_idx" ON "app_event_comment" USING btree ("createdById");--> statement-breakpoint
CREATE INDEX "like_event_id_idx" ON "app_event_like" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "event_created_by_idx" ON "app_event" USING btree ("createdById");--> statement-breakpoint
CREATE INDEX "event_date_idx" ON "app_event" USING btree ("event_date");
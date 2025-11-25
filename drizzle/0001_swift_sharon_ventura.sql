CREATE TYPE "public"."notification_type" AS ENUM('event', 'task', 'project', 'system');--> statement-breakpoint
CREATE TABLE "app_notifications" (
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
ALTER TABLE "app_notifications" ADD CONSTRAINT "app_notifications_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notification_user_idx" ON "app_notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notification_read_idx" ON "app_notifications" USING btree ("read");--> statement-breakpoint
CREATE INDEX "notification_created_idx" ON "app_notifications" USING btree ("created_at");
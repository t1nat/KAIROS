CREATE TYPE "public"."rsvp_status" AS ENUM('going', 'maybe', 'not_going');--> statement-breakpoint
CREATE TABLE "app_event_rsvp" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"status" "rsvp_status" NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app_event" ADD COLUMN "enable_rsvp" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "app_event" ADD COLUMN "send_reminders" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "app_event" ADD COLUMN "reminder_sent" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "app_event_rsvp" ADD CONSTRAINT "app_event_rsvp_event_id_app_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."app_event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_event_rsvp" ADD CONSTRAINT "app_event_rsvp_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "rsvp_event_idx" ON "app_event_rsvp" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "rsvp_user_idx" ON "app_event_rsvp" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "rsvp_unique" ON "app_event_rsvp" USING btree ("event_id","user_id");
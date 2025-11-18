CREATE TABLE "app_sticky_note" (
	"id" serial PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"password_hash" varchar(256),
	"password_salt" varchar(256),
	"created_by_id" varchar(255) NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "app_sticky_note" ADD CONSTRAINT "app_sticky_note_created_by_id_app_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "note_created_by_idx" ON "app_sticky_note" USING btree ("created_by_id");

CREATE TYPE "public"."permission" AS ENUM('read', 'write');--> statement-breakpoint
CREATE TYPE "public"."share_status" AS ENUM('private', 'shared_read', 'shared_write');--> statement-breakpoint
CREATE TABLE "app_note_collaborators" (
    "note_id" integer NOT NULL,
    "collaboratorId" varchar(255) NOT NULL, <-- This NOT NULL is okay
    "permission" "permission" DEFAULT 'write' NOT NULL,
    CONSTRAINT "app_note_collaborators_note_id_collaboratorId_pk" PRIMARY KEY("note_id","collaboratorId")
);
--> statement-breakpoint
ALTER TABLE "app_sticky_note" RENAME TO "app_sticky_notes";--> statement-breakpoint
ALTER TABLE "app_sticky_notes" DROP CONSTRAINT "app_sticky_note_created_by_id_app_user_id_fk";
ALTER TABLE "app_note_collaborators" ADD CONSTRAINT "app_note_collaborators_note_id_app_sticky_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."app_sticky_notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_note_collaborators" ADD CONSTRAINT "app_note_collaborators_collaboratorId_app_user_id_fk" FOREIGN KEY ("collaboratorId") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
--> statement-breakpoint
DROP INDEX "note_created_by_idx";--> statement-breakpoint
ALTER TABLE "app_sticky_notes" ALTER COLUMN "created_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "app_sticky_notes" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "app_sticky_notes" ADD COLUMN "createdById" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "app_sticky_notes" ADD COLUMN "share_status" "share_status" DEFAULT 'private' NOT NULL;--> statement-breakpoint

CREATE INDEX "collaborator_user_id_idx" ON "app_note_collaborators" USING btree ("collaboratorId");--> statement-breakpoint
ALTER TABLE "app_sticky_notes" ADD CONSTRAINT "app_sticky_notes_createdById_app_user_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "note_created_by_idx" ON "app_sticky_notes" USING btree ("createdById");--> statement-breakpoint
ALTER TABLE "app_sticky_notes" DROP COLUMN "created_by_id";--> statement-breakpoint
ALTER TABLE "app_sticky_notes" DROP COLUMN "updated_at";

ALTER TABLE "app_note_collaborators" ALTER COLUMN "permission" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "app_sticky_notes" ALTER COLUMN "share_status" DROP DEFAULT;
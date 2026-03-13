CREATE TABLE IF NOT EXISTS "password_reset_code" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "password_reset_code_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"email" varchar(255) NOT NULL,
	"code" varchar(8) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "organization_invites" ADD COLUMN "display_role" varchar(100); EXCEPTION WHEN duplicate_column THEN NULL; END $$;

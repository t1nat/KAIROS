CREATE TABLE IF NOT EXISTS "notebooks" (
	"id" integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	"name" varchar(256) NOT NULL,
	"description" text,
	"createdById" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "note_shares" (
	"id" integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	"note_id" integer NOT NULL,
	"shared_with_id" varchar(255) NOT NULL,
	"permission" "permission" DEFAULT 'read' NOT NULL,
	"shared_by_id" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);

DO $$ BEGIN ALTER TABLE "sticky_notes" ADD COLUMN "title" varchar(256); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "sticky_notes" ADD COLUMN "notebook_id" integer; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "sticky_notes" ADD COLUMN "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE "notebooks" ADD CONSTRAINT "notebooks_createdById_user_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE "note_shares" ADD CONSTRAINT "note_shares_note_id_sticky_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."sticky_notes"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE "note_shares" ADD CONSTRAINT "note_shares_shared_with_id_user_id_fk" FOREIGN KEY ("shared_with_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE "note_shares" ADD CONSTRAINT "note_shares_shared_by_id_user_id_fk" FOREIGN KEY ("shared_by_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE "sticky_notes" ADD CONSTRAINT "sticky_notes_notebook_id_notebooks_id_fk" FOREIGN KEY ("notebook_id") REFERENCES "public"."notebooks"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "notebook_created_by_idx" ON "notebooks" USING btree ("createdById");
CREATE INDEX IF NOT EXISTS "note_notebook_idx" ON "sticky_notes" USING btree ("notebook_id");
CREATE INDEX IF NOT EXISTS "note_share_note_idx" ON "note_shares" USING btree ("note_id");
CREATE INDEX IF NOT EXISTS "note_share_user_idx" ON "note_shares" USING btree ("shared_with_id");

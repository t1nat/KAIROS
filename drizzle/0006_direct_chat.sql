-- Direct (1:1) conversations scoped to a project or organization

CREATE TABLE IF NOT EXISTS "direct_conversations" (
  "id" serial PRIMARY KEY,
  "project_id" integer REFERENCES "projects"("id") ON DELETE CASCADE,
  "organization_id" integer REFERENCES "organizations"("id") ON DELETE CASCADE,
  "user_one_id" varchar(255) NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "user_two_id" varchar(255) NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "last_message_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "direct_convo_project_idx" ON "direct_conversations"("project_id");
CREATE INDEX IF NOT EXISTS "direct_convo_org_idx" ON "direct_conversations"("organization_id");
CREATE INDEX IF NOT EXISTS "direct_convo_user_one_idx" ON "direct_conversations"("user_one_id");
CREATE INDEX IF NOT EXISTS "direct_convo_user_two_idx" ON "direct_conversations"("user_two_id");

CREATE TABLE IF NOT EXISTS "direct_messages" (
  "id" serial PRIMARY KEY,
  "conversation_id" integer NOT NULL REFERENCES "direct_conversations"("id") ON DELETE CASCADE,
  "sender_id" varchar(255) NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "body" text NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "direct_msg_conversation_idx" ON "direct_messages"("conversation_id");
CREATE INDEX IF NOT EXISTS "direct_msg_sender_idx" ON "direct_messages"("sender_id");
CREATE INDEX IF NOT EXISTS "direct_msg_created_idx" ON "direct_messages"("created_at");

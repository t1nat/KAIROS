-- Agent runs and events

CREATE TYPE "agent_run_status" AS ENUM ('pending', 'running', 'succeeded', 'failed', 'cancelled');

CREATE TABLE IF NOT EXISTS "agent_runs" (
  "id" serial PRIMARY KEY,
  "agent_id" varchar(128) NOT NULL,
  "user_id" varchar(255) NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "status" "agent_run_status" NOT NULL DEFAULT 'pending',
  "summary" text,
  "error" text,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS "agent_runs_agent_id_idx" ON "agent_runs" ("agent_id");
CREATE INDEX IF NOT EXISTS "agent_runs_user_id_idx" ON "agent_runs" ("user_id");
CREATE INDEX IF NOT EXISTS "agent_runs_status_idx" ON "agent_runs" ("status");

CREATE TABLE IF NOT EXISTS "agent_run_events" (
  "id" serial PRIMARY KEY,
  "run_id" integer NOT NULL REFERENCES "agent_runs"("id") ON DELETE CASCADE,
  "type" varchar(128) NOT NULL,
  "payload" text NOT NULL,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS "agent_run_events_run_id_idx" ON "agent_run_events" ("run_id");
CREATE INDEX IF NOT EXISTS "agent_run_events_type_idx" ON "agent_run_events" ("type");

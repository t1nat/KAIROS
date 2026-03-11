import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "~/env";
import * as schema from "./schema";


const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};


const databaseUrl =
  env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/kairos";

const conn = globalForDb.conn ?? postgres(databaseUrl, {
  max: 3,
  idle_timeout: 20,
  max_lifetime: 60 * 30,
  prepare: false,
});

globalForDb.conn = conn;

export const db = drizzle(conn, { schema });
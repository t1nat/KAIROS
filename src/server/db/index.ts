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
  max: 30,
  prepare: env.NODE_ENV === "production",
});

if (env.NODE_ENV !== "production") globalForDb.conn = conn;

export const db = drizzle(conn, { schema });
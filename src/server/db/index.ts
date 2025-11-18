import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "~/env";
import * as schema from "./schema";

/**
 * Cache the database connection in development. This avoids creating a new connection on every HMR
 * update.
 */
const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

// We are now passing an options object to the postgres client.
// We set 'max' to 30 to increase the connection pool size, giving us more headroom
// to prevent "timeout" errors when the app is under load or connections hang.
const conn = globalForDb.conn ?? postgres(env.DATABASE_URL, {
    max: 30, // <-- CRUCIAL CHANGE: Increased pool size to 30 (default is often 10)
});

if (env.NODE_ENV !== "production") globalForDb.conn = conn;

export const db = drizzle(conn, { schema });
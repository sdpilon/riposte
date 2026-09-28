import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { getDatabaseUrl } from "@/lib/config/env";
import * as schema from "./schema";

/**
 * Neon's HTTP driver, not a pooled TCP client — a better fit for short-lived
 * serverless function invocations than `pg`'s connection pooling (see
 * specs/001-account-progress-sweep/research.md, "Database / query layer").
 * A self-hoster on a different Postgres swaps this file's driver
 * (`drizzle-orm/node-postgres` or `drizzle-orm/postgres-js`) for their own —
 * `schema.ts` and every query elsewhere in the app stay unchanged.
 */
type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

let cached: DrizzleDb | undefined;

// Lazy: constructed on first actual query, not on module import. Importing
// this module (e.g. transitively, for a type or an unrelated pure function
// in the same file tree) must not require DATABASE_URL to be set — only
// running a real query does.
function getDb(): DrizzleDb {
  if (!cached) {
    cached = drizzle(neon(getDatabaseUrl()), { schema });
  }
  return cached;
}

export const db: DrizzleDb = new Proxy({} as DrizzleDb, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});

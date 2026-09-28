import { defineConfig } from "drizzle-kit";

// drizzle-kit is a separate CLI process (not the running app), so it reads
// DATABASE_URL directly from the environment rather than through
// lib/config/env.ts.
export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});

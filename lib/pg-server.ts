import "server-only";
import postgres from "postgres";

let sql: ReturnType<typeof postgres> | null = null;

/**
 * Direct Postgres for local/dev when SUPABASE_SECRET_KEY is not set yet.
 * Prefer the Supabase JS client in production (RLS + service role).
 */
export function pgServer() {
  if (sql) return sql;
  const url = process.env.SUPABASE_DB_URL;
  if (!url) throw new Error("SUPABASE_DB_URL is not configured");
  sql = postgres(url, { max: 1, prepare: false });
  return sql;
}

export function canUsePgFallback(): boolean {
  return !process.env.SUPABASE_SECRET_KEY && !!process.env.SUPABASE_DB_URL;
}

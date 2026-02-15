/**
 * Database connection error handling for scripts.
 * When DATABASE_URL uses the direct Supabase host (db.xxx.supabase.co) and you get ENOTFOUND,
 * use the Connection pooler URL instead (see hint below).
 */

const POOLER_HINT = `
DATABASE_URL is using the direct Supabase host (db.xxx.supabase.co), which often fails with ENOTFOUND when:
  - The project is paused (Supabase free tier pauses after inactivity)
  - Your network or DNS cannot resolve the direct host

Fix: Use the Connection pooler URL instead.
  1. Open Supabase Dashboard → your project → Project Settings → Database
  2. Under "Connection string", select "URI" and "Transaction" mode
  3. Copy the URI (host will be aws-0-<region>.pooler.supabase.com, port 6543)
  4. Username must be postgres.<PROJECT_REF> (e.g. postgres.woarfwndyghqjygqkqlc)
  5. Set DATABASE_URL in .env to that URI

Example format:
  postgresql://postgres.PROJECT_REF:YOUR_PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres
`;

export function getDatabaseUrlHint(): string {
  const url = process.env.DATABASE_URL ?? "";
  const isDirectSupabase =
    /@db\.[a-z0-9]+\.supabase\.co(?::\d+)?\//.test(url) ||
    (url.includes("db.") && url.includes("supabase.co"));
  return isDirectSupabase ? POOLER_HINT : "";
}

/**
 * If err is a connection error (ENOTFOUND, etc.) and DATABASE_URL looks like direct Supabase,
 * return a new Error with the pooler hint. Otherwise return the original error.
 */
export function wrapDatabaseConnectionError(err: unknown): Error {
  const cause = err instanceof Error ? err : new Error(String(err));
  const code = (cause as NodeJS.ErrnoException).code;
  const message = cause.message ?? "";
  const isConnectionError =
    code === "ENOTFOUND" ||
    code === "ETIMEDOUT" ||
    code === "ECONNREFUSED" ||
    message.includes("ENOTFOUND") ||
    message.includes("ETIMEDOUT");
  const hint = getDatabaseUrlHint();
  if (isConnectionError && hint) {
    const wrapped = new Error(`Database connection failed.${hint}`);
    (wrapped as Error & { cause?: unknown }).cause = cause;
    return wrapped;
  }
  return cause;
}

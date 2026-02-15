import { createClient, SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/**
 * Server-only Supabase client using service role (bypasses RLS).
 * Use when DATABASE_URL pooler fails (e.g. "Tenant or user not found" on Vercel).
 * Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel to enable.
 */
export function getSupabase(): SupabaseClient | null {
  if (client !== null) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}

export const useSupabase = !!(
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
);

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// Disable prefetch for Supabase connection pooler (Transaction mode)
const client = postgres(process.env.DATABASE_URL!, { prepare: false });
export const db = drizzle(client);

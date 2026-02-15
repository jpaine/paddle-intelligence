import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// Supabase: prepare: false for pooler; ssl: require for serverless
const client = postgres(process.env.DATABASE_URL!, {
  prepare: false,
  ssl: "require",
  max: 1,
  connect_timeout: 10,
});
export const db = drizzle(client);

/**
 * Set session statement_timeout (ms) so long-running import queries don't get killed by Supabase default.
 * Call at the start of import scripts. Only affects the current connection (max: 1 in our db client).
 */
import { postgresClient } from "../../src/db";

export async function setStatementTimeoutMs(ms: number): Promise<void> {
  await postgresClient`SELECT set_config('statement_timeout', ${String(ms)}, true)`;
}

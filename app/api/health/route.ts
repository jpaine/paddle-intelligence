import { NextResponse } from "next/server";
import { getPaddleCount, getBrandCount } from "@/src/data/paddles";
import { getSupabase } from "@/src/lib/supabase-server";

export const dynamic = "force-dynamic";

/**
 * GET /api/health – Check database connectivity and row counts.
 * Uses Supabase Data API when SUPABASE_* env is set; otherwise Postgres (pooler).
 */
export async function GET() {
  try {
    const paddleCount = await getPaddleCount();
    const brandCount = await getBrandCount();
    const source = getSupabase() ? "supabase" : "postgres";

    return NextResponse.json({
      ok: true,
      database: "connected",
      source,
      paddles: paddleCount,
      brands: brandCount,
      message:
        paddleCount === 0
          ? "Database is connected but empty. Run: pnpm import (with DATABASE_URL in .env)"
          : undefined,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const cause = e instanceof Error && e.cause ? String(e.cause) : null;
    console.error("[health] database error:", message, cause ?? "");
    return NextResponse.json(
      {
        ok: false,
        database: "error",
        error: message,
        ...(cause && { cause }),
        message:
          "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel for Data API, or fix DATABASE_URL pooler.",
      },
      { status: 503 }
    );
  }
}

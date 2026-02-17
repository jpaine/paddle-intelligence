/**
 * GET /api/cron/sync – Vercel Cron handler for daily USAP paddle sync.
 *
 * Uses the Supabase REST API (via @supabase/supabase-js) so it works on
 * Vercel serverless even though the direct Postgres host is IPv6-only.
 *
 * Configured in vercel.json with schedule "0 6 * * *" (daily 06:00 UTC).
 * Protected by CRON_SECRET to prevent unauthorized invocation.
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import * as cheerio from "cheerio";
import { v4 as uuidv4 } from "uuid";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // seconds (Vercel Pro: up to 300)

const USAP_SOURCE_URL = "https://equipment.usapickleball.org/paddle-list/";
const USAP_HOSTNAME = "equipment.usapickleball.org";
const CONCURRENCY = 10; // Lower than CLI script for serverless
const BATCH = 100;

/* ── Slugify (same as scripts/lib/slug.ts) ── */
function slugify(brand: string, model: string): string {
  return `${brand}-${model}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/* ── USAP page fetcher ── */
type UsapRow = { manufacturer: string; model: string };

async function fetchPage(pagenum: number): Promise<UsapRow[]> {
  const url = `${USAP_SOURCE_URL}?pagenum=${pagenum}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "PaddleIntelligence/1.0 (research index; public data)" },
  });
  if (!res.ok) return [];
  const html = await res.text();
  const $ = cheerio.load(html);
  const links: string[] = [];
  $('a[href*="paddle-list/entry"]').each((_, el) => {
    const text = $(el).text().trim();
    const href = $(el).attr("href") ?? "";
    if (text && !href.includes("pagenum")) links.push(text);
  });
  const rows: UsapRow[] = [];
  for (let i = 0; i + 2 < links.length; i += 3) {
    if (links[i] && links[i + 1]) {
      rows.push({ manufacturer: links[i], model: links[i + 1] });
    }
  }
  return rows;
}

async function runWithLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  let idx = 0;
  async function worker(): Promise<void> {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

/* ── Main handler ── */
export async function GET(request: Request) {
  // Verify cron secret (Vercel sets this header automatically for cron invocations)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  const jobId = uuidv4();
  const startedAt = new Date().toISOString();

  try {
    // Record job start
    await supabase.from("job_runs").insert({
      id: jobId,
      type: "sync_usap",
      status: "running",
      started_at: startedAt,
      completed_at: null,
    });

    // Fetch all USAP pages
    const totalPages = 200;
    const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages = await runWithLimit(pageNumbers, CONCURRENCY, fetchPage);
    const allRows = pages.flat();

    // Dedupe by manufacturer+model
    const seen = new Set<string>();
    const uniqueRows = allRows.filter((r) => {
      const key = `${r.manufacturer}|${r.model}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Ensure USAP source exists
    const { data: existingSources } = await supabase
      .from("sources")
      .select("id")
      .eq("hostname", USAP_HOSTNAME)
      .limit(1);

    const now = new Date().toISOString();
    let sourceId: string;

    if (existingSources && existingSources.length > 0) {
      sourceId = existingSources[0].id;
      await supabase.from("sources").update({ last_verified: now }).eq("id", sourceId);
    } else {
      sourceId = uuidv4();
      await supabase.from("sources").insert({
        id: sourceId,
        base_url: USAP_SOURCE_URL,
        hostname: USAP_HOSTNAME,
        last_verified: now,
        created_at: now,
      });
    }

    // Upsert paddles in batches
    let upserted = 0;
    for (let i = 0; i < uniqueRows.length; i += BATCH) {
      const batch = uniqueRows.slice(i, i + BATCH);
      const bySlug = new Map<string, UsapRow>();
      for (const r of batch) {
        const slug = slugify(r.manufacturer, r.model);
        if (!bySlug.has(slug)) bySlug.set(slug, r);
      }

      for (const [slug, r] of Array.from(bySlug.entries())) {
        const { data: existing } = await supabase
          .from("paddles")
          .select("id")
          .eq("slug", slug)
          .limit(1);

        let paddleId: string;
        if (existing && existing.length > 0) {
          paddleId = existing[0].id;
          await supabase
            .from("paddles")
            .update({
              brand: r.manufacturer,
              model: r.model,
              usap_approved: true,
              updated_at: now,
            })
            .eq("id", paddleId);
        } else {
          paddleId = uuidv4();
          await supabase.from("paddles").insert({
            id: paddleId,
            slug,
            brand: r.manufacturer,
            model: r.model,
            usap_approved: true,
            created_at: now,
            updated_at: now,
          });
        }

        // Link to source
        await supabase
          .from("paddle_sources")
          .upsert(
            {
              paddle_id: paddleId,
              source_id: sourceId,
              source_url: USAP_SOURCE_URL,
              last_verified_at: now,
            },
            { onConflict: "paddle_id,source_id" }
          );

        upserted++;
      }
    }

    // Mark job complete
    await supabase
      .from("job_runs")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", jobId);

    return NextResponse.json({
      ok: true,
      fetched: uniqueRows.length,
      upserted,
      jobId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Try to mark job as failed
    try {
      await supabase
        .from("job_runs")
        .update({ status: "failed", completed_at: new Date().toISOString() })
        .eq("id", jobId);
    } catch {
      // ignore – best-effort status update
    }

    console.error("[cron/sync] error:", message);
    return NextResponse.json({ ok: false, error: message, jobId }, { status: 500 });
  }
}

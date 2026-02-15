/**
 * Paddle read layer: uses Supabase Data API when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 * are set (e.g. on Vercel when pooler fails), otherwise Drizzle/Postgres.
 */

import { getSupabase } from "@/src/lib/supabase-server";
import { db } from "@/src/db";
import { paddles, sources, paddleSources, jobRuns } from "@/src/db/schema";
import { asc, desc, eq, and, gte, lte, or, sql } from "drizzle-orm";

export type PaddleRow = {
  id: string;
  slug: string;
  brand: string;
  model: string;
  variant: string | null;
  thicknessMm: number | null;
  weightMin: number | null;
  weightMax: number | null;
  faceMaterial: string | null;
  coreMaterial: string | null;
  thermoformed: boolean | null;
  msrpUsd: number | null;
  releaseYear: number | null;
  usapApproved: boolean | null;
  usapListingUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type PaddleSourceRow = {
  url: string;
  hostname: string;
  lastVerified: Date | null;
  sourceUrl: string | null;
  lastVerifiedAt: Date | null;
};

function fromSupabasePaddle(r: Record<string, unknown>): PaddleRow {
  return {
    id: r.id as string,
    slug: r.slug as string,
    brand: r.brand as string,
    model: r.model as string,
    variant: (r.variant as string) ?? null,
    thicknessMm: (r.thickness_mm as number) ?? null,
    weightMin: (r.weight_min as number) ?? null,
    weightMax: (r.weight_max as number) ?? null,
    faceMaterial: (r.face_material as string) ?? null,
    coreMaterial: (r.core_material as string) ?? null,
    thermoformed: (r.thermoformed as boolean) ?? null,
    msrpUsd: (r.msrp_usd as number) ?? null,
    releaseYear: (r.release_year as number) ?? null,
    usapApproved: (r.usap_approved as boolean) ?? null,
    usapListingUrl: (r.usap_listing_url as string) ?? null,
    createdAt: new Date(r.created_at as string),
    updatedAt: new Date(r.updated_at as string),
  };
}

export async function getPaddleCount(): Promise<number> {
  const supabase = getSupabase();
  if (supabase) {
    const { count, error } = await supabase
      .from("paddles")
      .select("*", { count: "exact", head: true });
    if (error) throw new Error(error.message);
    return count ?? 0;
  }
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(paddles);
  return row?.count ?? 0;
}

export async function getBrandCount(): Promise<number> {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase.from("paddles").select("brand");
    if (error) throw new Error(error.message);
    const brands = new Set((data ?? []).map((r: { brand: string }) => r.brand));
    return brands.size;
  }
  const [row] = await db
    .select({ count: sql<number>`count(distinct ${paddles.brand})::int` })
    .from(paddles);
  return row?.count ?? 0;
}

export async function getStats(): Promise<{
  totalPaddles: number;
  totalBrands: number;
  lastUpdated: string;
}> {
  const supabase = getSupabase();
  if (supabase) {
    const [paddleCount, brandCount, jobRows, paddleRows] = await Promise.all([
      getPaddleCount(),
      getBrandCount(),
      supabase
        .from("job_runs")
        .select("completed_at")
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false })
        .limit(1),
      supabase
        .from("paddles")
        .select("updated_at")
        .order("updated_at", { ascending: false })
        .limit(1),
    ]);
    const lastRun = jobRows.data?.[0]?.completed_at;
    const lastPaddle = paddleRows.data?.[0]?.updated_at;
    const fallback = lastPaddle ?? lastRun ?? new Date(0).toISOString();
    const display =
      lastRun && lastPaddle && new Date(lastRun) > new Date(lastPaddle)
        ? lastRun
        : fallback;
    const displayUpdated =
      new Date(display).getTime() > 0
        ? new Date(display).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })
        : "—";
    return {
      totalPaddles: paddleCount,
      totalBrands: brandCount,
      lastUpdated: displayUpdated,
    };
  }
  try {
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(paddles);
    const [brandsResult] = await db
      .select({ count: sql<number>`count(distinct ${paddles.brand})::int` })
      .from(paddles);
    const [lastRun] = await db
      .select({ completedAt: jobRuns.completedAt })
      .from(jobRuns)
      .where(sql`${jobRuns.completedAt} is not null`)
      .orderBy(desc(jobRuns.completedAt))
      .limit(1);
    const [lastPaddle] = await db
      .select({ updatedAt: paddles.updatedAt })
      .from(paddles)
      .orderBy(desc(paddles.updatedAt))
      .limit(1);
    const fallbackUpdated =
      lastPaddle?.updatedAt ?? lastRun?.completedAt ?? new Date(0);
    const displayUpdated =
      lastRun?.completedAt &&
      lastRun.completedAt > fallbackUpdated
        ? lastRun.completedAt
        : fallbackUpdated;
    return {
      totalPaddles: countResult?.count ?? 0,
      totalBrands: brandsResult?.count ?? 0,
      lastUpdated:
        displayUpdated.getTime() > 0
          ? displayUpdated.toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })
          : "—",
    };
  } catch {
    return { totalPaddles: 0, totalBrands: 0, lastUpdated: "—" };
  }
}

const SORT_FIELDS = ["brand", "thickness", "msrp"] as const;
const SORT_COL_DB = { brand: "brand", thickness: "thickness_mm", msrp: "msrp_usd" } as const;

export type ListFilters = {
  brand?: string;
  thicknessMin?: number;
  thicknessMax?: number;
  faceMaterial?: string;
  coreMaterial?: string;
  thermoformed?: boolean;
  usapApproved?: boolean;
};

export async function getPaddlesList(options: {
  filters?: ListFilters;
  sort?: string;
  order?: "asc" | "desc";
  limit?: number;
  offset?: number;
}): Promise<{ items: PaddleRow[]; total: number }> {
  const {
    filters = {},
    sort = "brand",
    order = "asc",
    limit = 20,
    offset = 0,
  } = options;
  const supabase = getSupabase();
  if (supabase) {
    let q = supabase.from("paddles").select("*", { count: "exact" });
    if (filters.brand) q = q.eq("brand", filters.brand);
    if (filters.faceMaterial) q = q.eq("face_material", filters.faceMaterial);
    if (filters.coreMaterial) q = q.eq("core_material", filters.coreMaterial);
    if (filters.thermoformed !== undefined)
      q = q.eq("thermoformed", filters.thermoformed);
    if (filters.usapApproved !== undefined)
      q = q.eq("usap_approved", filters.usapApproved);
    if (filters.thicknessMin != null)
      q = q.gte("thickness_mm", filters.thicknessMin);
    if (filters.thicknessMax != null)
      q = q.lte("thickness_mm", filters.thicknessMax);
    const orderCol =
      SORT_FIELDS.includes(sort as (typeof SORT_FIELDS)[number]) ? sort : "brand";
    const col = SORT_COL_DB[orderCol as keyof typeof SORT_COL_DB] ?? "brand";
    q = q.order(col, { ascending: order === "asc" }).range(offset, offset + limit - 1);
    const { data, count, error } = await q;
    if (error) throw new Error(error.message);
    return {
      items: (data ?? []).map(fromSupabasePaddle),
      total: count ?? 0,
    };
  }
  const orderByColumn = SORT_FIELDS.includes(sort as (typeof SORT_FIELDS)[number])
    ? sort
    : "brand";
  const col =
    orderByColumn === "brand"
      ? paddles.brand
      : orderByColumn === "thickness"
        ? paddles.thicknessMm
        : paddles.msrpUsd;
  const orderDir = order === "desc" ? desc : asc;
  const conditions: ReturnType<typeof eq>[] = [];
  if (filters.brand) conditions.push(eq(paddles.brand, filters.brand));
  if (filters.faceMaterial)
    conditions.push(eq(paddles.faceMaterial, filters.faceMaterial));
  if (filters.coreMaterial)
    conditions.push(eq(paddles.coreMaterial, filters.coreMaterial));
  if (filters.thermoformed !== undefined)
    conditions.push(eq(paddles.thermoformed, filters.thermoformed));
  if (filters.usapApproved !== undefined)
    conditions.push(eq(paddles.usapApproved, filters.usapApproved));
  if (filters.thicknessMin != null)
    conditions.push(gte(paddles.thicknessMm, filters.thicknessMin));
  if (filters.thicknessMax != null)
    conditions.push(lte(paddles.thicknessMm, filters.thicknessMax));
  const whereClause =
    conditions.length === 0
      ? undefined
      : conditions.length === 1
        ? conditions[0]
        : and(...conditions);
  const [countResult, rows] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(paddles)
      .where(whereClause),
    db
      .select()
      .from(paddles)
      .where(whereClause)
      .orderBy(orderDir(col))
      .limit(limit)
      .offset(offset),
  ]);
  const total = countResult?.[0]?.count ?? 0;
  const items: PaddleRow[] = rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    brand: r.brand,
    model: r.model,
    variant: r.variant ?? null,
    thicknessMm: r.thicknessMm ?? null,
    weightMin: r.weightMin ?? null,
    weightMax: r.weightMax ?? null,
    faceMaterial: r.faceMaterial ?? null,
    coreMaterial: r.coreMaterial ?? null,
    thermoformed: r.thermoformed ?? null,
    msrpUsd: r.msrpUsd ?? null,
    releaseYear: r.releaseYear ?? null,
    usapApproved: r.usapApproved ?? null,
    usapListingUrl: r.usapListingUrl ?? null,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));
  return { items, total };
}

export async function getPaddleSlugs(): Promise<string[]> {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase.from("paddles").select("slug");
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: { slug: string }) => r.slug);
  }
  const rows = await db.select({ slug: paddles.slug }).from(paddles);
  return rows.map((r) => r.slug);
}

export async function getPaddleBySlug(
  slug: string
): Promise<{ paddle: PaddleRow; sources: PaddleSourceRow[] } | null> {
  const supabase = getSupabase();
  if (supabase) {
    const { data: paddleRows, error: e1 } = await supabase
      .from("paddles")
      .select("*")
      .eq("slug", slug)
      .limit(1);
    if (e1) throw new Error(e1.message);
    const paddleRow = paddleRows?.[0];
    if (!paddleRow) return null;
    const paddle = fromSupabasePaddle(paddleRow as Record<string, unknown>);
    const { data: psRows, error: e2 } = await supabase
      .from("paddle_sources")
      .select("source_id")
      .eq("paddle_id", paddle.id);
    if (e2) throw new Error(e2.message);
    const sourceIds = (psRows ?? []).map((r: { source_id: string }) => r.source_id);
    if (sourceIds.length === 0)
      return { paddle, sources: [] };
    const { data: sourceRows, error: e3 } = await supabase
      .from("sources")
      .select("id, base_url, hostname, last_verified")
      .in("id", sourceIds);
    if (e3) throw new Error(e3.message);
    const { data: psLinkRows } = await supabase
      .from("paddle_sources")
      .select("source_id, source_url, last_verified_at")
      .eq("paddle_id", paddle.id);
    const linkBySourceId = new Map(
      (psLinkRows ?? []).map((r: { source_id: string; source_url: string | null; last_verified_at: string | null }) => [r.source_id, r])
    );
    const sources: PaddleSourceRow[] = (sourceRows ?? []).map(
      (s: { id: string; base_url: string; hostname: string; last_verified: string | null }) => {
        const link = linkBySourceId.get(s.id);
        const sourceUrl = link?.source_url ?? null;
        const url = sourceUrl ?? s.base_url;
        return {
          url,
          hostname: s.hostname,
          lastVerified: s.last_verified ? new Date(s.last_verified) : null,
          sourceUrl,
          lastVerifiedAt: link?.last_verified_at ? new Date(link.last_verified_at) : null,
        };
      }
    );
    return { paddle, sources };
  }
  const [paddle] = await db.select().from(paddles).where(eq(paddles.slug, slug));
  if (!paddle) return null;
  const sourceRows = await db
    .select({
      baseUrl: sources.baseUrl,
      hostname: sources.hostname,
      lastVerified: sources.lastVerified,
      sourceUrl: paddleSources.sourceUrl,
      lastVerifiedAt: paddleSources.lastVerifiedAt,
    })
    .from(paddleSources)
    .innerJoin(sources, eq(paddleSources.sourceId, sources.id))
    .where(eq(paddleSources.paddleId, paddle.id));
  return {
    paddle: {
      id: paddle.id,
      slug: paddle.slug,
      brand: paddle.brand,
      model: paddle.model,
      variant: paddle.variant ?? null,
      thicknessMm: paddle.thicknessMm ?? null,
      weightMin: paddle.weightMin ?? null,
      weightMax: paddle.weightMax ?? null,
      faceMaterial: paddle.faceMaterial ?? null,
      coreMaterial: paddle.coreMaterial ?? null,
      thermoformed: paddle.thermoformed ?? null,
      msrpUsd: paddle.msrpUsd ?? null,
      releaseYear: paddle.releaseYear ?? null,
      usapApproved: paddle.usapApproved ?? null,
      usapListingUrl: paddle.usapListingUrl ?? null,
      createdAt: paddle.createdAt,
      updatedAt: paddle.updatedAt,
    },
    sources: sourceRows.map((s) => ({
      url: s.sourceUrl ?? s.baseUrl,
      hostname: s.hostname,
      lastVerified: s.lastVerified ?? null,
      sourceUrl: s.sourceUrl ?? null,
      lastVerifiedAt: s.lastVerifiedAt ?? null,
    })),
  };
}

export async function getPaddleById(
  idOrSlug: string
): Promise<{ paddle: PaddleRow; sources: PaddleSourceRow[] } | null> {
  const bySlug = await getPaddleBySlug(idOrSlug);
  if (bySlug) return bySlug;
  const supabase = getSupabase();
  if (supabase) {
    const { data: paddleRows, error: e1 } = await supabase
      .from("paddles")
      .select("*")
      .eq("id", idOrSlug)
      .limit(1);
    if (e1) throw new Error(e1.message);
    const paddleRow = paddleRows?.[0];
    if (!paddleRow) return null;
    const paddle = fromSupabasePaddle(paddleRow as Record<string, unknown>);
    const { data: psRows, error: e2 } = await supabase
      .from("paddle_sources")
      .select("source_id")
      .eq("paddle_id", paddle.id);
    if (e2) throw new Error(e2.message);
    const sourceIds = (psRows ?? []).map((r: { source_id: string }) => r.source_id);
    if (sourceIds.length === 0)
      return { paddle, sources: [] };
    const { data: sourceRows, error: e3 } = await supabase
      .from("sources")
      .select("id, base_url, hostname, last_verified")
      .in("id", sourceIds);
    if (e3) throw new Error(e3.message);
    const { data: psLinkRows } = await supabase
      .from("paddle_sources")
      .select("source_id, source_url, last_verified_at")
      .eq("paddle_id", paddle.id);
    const linkBySourceId = new Map(
      (psLinkRows ?? []).map((r: { source_id: string; source_url: string | null; last_verified_at: string | null }) => [r.source_id, r])
    );
    const sources: PaddleSourceRow[] = (sourceRows ?? []).map(
      (s: { id: string; base_url: string; hostname: string; last_verified: string | null }) => {
        const link = linkBySourceId.get(s.id);
        const sourceUrl = link?.source_url ?? null;
        const url = sourceUrl ?? s.base_url;
        return {
          url,
          hostname: s.hostname,
          lastVerified: s.last_verified ? new Date(s.last_verified) : null,
          sourceUrl,
          lastVerifiedAt: link?.last_verified_at ? new Date(link.last_verified_at) : null,
        };
      }
    );
    return { paddle, sources };
  }
  const [paddle] = await db
    .select()
    .from(paddles)
    .where(or(eq(paddles.id, idOrSlug), eq(paddles.slug, idOrSlug)));
  if (!paddle) return null;
  const sourceRows = await db
    .select({
      baseUrl: sources.baseUrl,
      hostname: sources.hostname,
      lastVerified: sources.lastVerified,
      sourceUrl: paddleSources.sourceUrl,
      lastVerifiedAt: paddleSources.lastVerifiedAt,
    })
    .from(paddleSources)
    .innerJoin(sources, eq(paddleSources.sourceId, sources.id))
    .where(eq(paddleSources.paddleId, paddle.id));
  return {
    paddle: {
      id: paddle.id,
      slug: paddle.slug,
      brand: paddle.brand,
      model: paddle.model,
      variant: paddle.variant ?? null,
      thicknessMm: paddle.thicknessMm ?? null,
      weightMin: paddle.weightMin ?? null,
      weightMax: paddle.weightMax ?? null,
      faceMaterial: paddle.faceMaterial ?? null,
      coreMaterial: paddle.coreMaterial ?? null,
      thermoformed: paddle.thermoformed ?? null,
      msrpUsd: paddle.msrpUsd ?? null,
      releaseYear: paddle.releaseYear ?? null,
      usapApproved: paddle.usapApproved ?? null,
      usapListingUrl: paddle.usapListingUrl ?? null,
      createdAt: paddle.createdAt,
      updatedAt: paddle.updatedAt,
    },
    sources: sourceRows.map((s) => ({
      url: s.sourceUrl ?? s.baseUrl,
      hostname: s.hostname,
      lastVerified: s.lastVerified ?? null,
      sourceUrl: s.sourceUrl ?? null,
      lastVerifiedAt: s.lastVerifiedAt ?? null,
    })),
  };
}

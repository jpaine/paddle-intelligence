import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/db";

export const dynamic = "force-dynamic";
import { paddles } from "@/src/db/schema";
import { asc, desc, eq, and, gte, lte, sql } from "drizzle-orm";

const SORT_FIELDS = ["brand", "thickness", "msrp"] as const;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const brand = searchParams.get("brand") ?? undefined;
    const thicknessMin = searchParams.get("thickness_min");
    const thicknessMax = searchParams.get("thickness_max");
    const faceMaterial = searchParams.get("face_material") ?? undefined;
    const coreMaterial = searchParams.get("core_material") ?? undefined;
    const thermoformed = searchParams.get("thermoformed");
    const usapApproved = searchParams.get("usap_approved");
    const sort = searchParams.get("sort") ?? "brand";
    const order = searchParams.get("order") ?? "asc";
    const limit = Math.min(
      parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT,
      MAX_LIMIT
    );
    const offset = parseInt(searchParams.get("offset") ?? "0", 10) || 0;

    const orderByColumn = SORT_FIELDS.includes(sort as (typeof SORT_FIELDS)[number])
      ? sort
      : "brand";
    const col =
      orderByColumn === "brand"
        ? paddles.brand
        : orderByColumn === "thickness"
          ? paddles.thickness
          : paddles.msrp;
    const orderDir = order === "desc" ? desc : asc;

    const conditions: ReturnType<typeof eq>[] = [];
    if (brand) conditions.push(eq(paddles.brand, brand));
    if (faceMaterial) conditions.push(eq(paddles.faceMaterial, faceMaterial));
    if (coreMaterial) conditions.push(eq(paddles.coreMaterial, coreMaterial));
    if (thermoformed === "true") conditions.push(eq(paddles.thermoformed, true));
    if (thermoformed === "false") conditions.push(eq(paddles.thermoformed, false));
    if (usapApproved === "true") conditions.push(eq(paddles.usapApproved, true));
    if (usapApproved === "false") conditions.push(eq(paddles.usapApproved, false));
    if (thicknessMin != null && thicknessMin !== "") {
      const n = parseFloat(thicknessMin);
      if (!Number.isNaN(n)) conditions.push(gte(paddles.thickness, n));
    }
    if (thicknessMax != null && thicknessMax !== "") {
      const n = parseFloat(thicknessMax);
      if (!Number.isNaN(n)) conditions.push(lte(paddles.thickness, n));
    }

    const whereClause =
      conditions.length === 0 ? undefined : conditions.length === 1 ? conditions[0] : and(...conditions);

    const [countResult, items] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(paddles)
        .where(whereClause),
      db
        .select({
          id: paddles.id,
          slug: paddles.slug,
          brand: paddles.brand,
          model: paddles.model,
          thickness: paddles.thickness,
          weightMin: paddles.weightMin,
          weightMax: paddles.weightMax,
          faceMaterial: paddles.faceMaterial,
          coreMaterial: paddles.coreMaterial,
          usapApproved: paddles.usapApproved,
        })
        .from(paddles)
        .where(whereClause)
        .orderBy(orderDir(col))
        .limit(limit)
        .offset(offset),
    ]);

    const total = countResult?.[0]?.count ?? 0;

    return NextResponse.json({
      items: items.map((r) => ({
        id: r.id,
        slug: r.slug,
        brand: r.brand,
        model: r.model,
        thickness: r.thickness,
        weight_min: r.weightMin,
        weight_max: r.weightMax,
        face_material: r.faceMaterial,
        core_material: r.coreMaterial,
        usap_approved: r.usapApproved,
      })),
      total,
    });
  } catch (e) {
    console.error("GET /api/paddles error:", e);
    return NextResponse.json(
      { error: "Failed to fetch paddles" },
      { status: 500 }
    );
  }
}

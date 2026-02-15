import { NextRequest, NextResponse } from "next/server";
import { getPaddlesList } from "@/src/data/paddles";

export const dynamic = "force-dynamic";

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
    const order = (searchParams.get("order") ?? "asc") as "asc" | "desc";
    const limit = Math.min(
      parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT,
      MAX_LIMIT
    );
    const offset = parseInt(searchParams.get("offset") ?? "0", 10) || 0;

    const filters: {
      brand?: string;
      thicknessMin?: number;
      thicknessMax?: number;
      faceMaterial?: string;
      coreMaterial?: string;
      thermoformed?: boolean;
      usapApproved?: boolean;
    } = {};
    if (brand) filters.brand = brand;
    if (faceMaterial) filters.faceMaterial = faceMaterial;
    if (coreMaterial) filters.coreMaterial = coreMaterial;
    if (thermoformed === "true") filters.thermoformed = true;
    if (thermoformed === "false") filters.thermoformed = false;
    if (usapApproved === "true") filters.usapApproved = true;
    if (usapApproved === "false") filters.usapApproved = false;
    if (thicknessMin != null && thicknessMin !== "") {
      const n = parseFloat(thicknessMin);
      if (!Number.isNaN(n)) filters.thicknessMin = n;
    }
    if (thicknessMax != null && thicknessMax !== "") {
      const n = parseFloat(thicknessMax);
      if (!Number.isNaN(n)) filters.thicknessMax = n;
    }

    const { items, total } = await getPaddlesList({
      filters,
      sort,
      order,
      limit,
      offset,
    });

    return NextResponse.json({
      items: items.map((r) => ({
        id: r.id,
        slug: r.slug,
        brand: r.brand,
        model: r.model,
        thickness_mm: r.thicknessMm,
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

import { NextRequest, NextResponse } from "next/server";
import { getPaddleById } from "@/src/data/paddles";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await getPaddleById(id);
    if (!result) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const { paddle, sources: sourceRows } = result;
    return NextResponse.json({
      id: paddle.id,
      slug: paddle.slug,
      brand: paddle.brand,
      model: paddle.model,
      thickness_mm: paddle.thicknessMm,
      weight_min: paddle.weightMin,
      weight_max: paddle.weightMax,
      face_material: paddle.faceMaterial,
      core_material: paddle.coreMaterial,
      thermoformed: paddle.thermoformed,
      msrp_usd: paddle.msrpUsd,
      release_year: paddle.releaseYear,
      usap_approved: paddle.usapApproved,
      created_at: paddle.createdAt,
      updated_at: paddle.updatedAt,
      sources: sourceRows.map((s) => ({
        url: s.url,
        hostname: s.hostname,
        last_verified: s.lastVerified,
        source_url: s.sourceUrl,
        last_verified_at: s.lastVerifiedAt,
      })),
    });
  } catch (e) {
    console.error("GET /api/paddles/[id] error:", e);
    return NextResponse.json(
      { error: "Failed to fetch paddle" },
      { status: 500 }
    );
  }
}

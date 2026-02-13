import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/db";
import { paddles, sources, paddleSources } from "@/src/db/schema";
import { eq, or } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [paddle] = await db
      .select()
      .from(paddles)
      .where(or(eq(paddles.id, id), eq(paddles.slug, id)));
    if (!paddle) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const sourceRows = await db
      .select({
        url: sources.url,
        hostname: sources.hostname,
        lastVerified: sources.lastVerified,
      })
      .from(paddleSources)
      .innerJoin(sources, eq(paddleSources.sourceId, sources.id))
      .where(eq(paddleSources.paddleId, paddle.id));

    return NextResponse.json({
      id: paddle.id,
      slug: paddle.slug,
      brand: paddle.brand,
      model: paddle.model,
      thickness: paddle.thickness,
      weight_min: paddle.weightMin,
      weight_max: paddle.weightMax,
      face_material: paddle.faceMaterial,
      core_material: paddle.coreMaterial,
      thermoformed: paddle.thermoformed,
      msrp: paddle.msrp,
      release_year: paddle.releaseYear,
      usap_approved: paddle.usapApproved,
      created_at: paddle.createdAt,
      updated_at: paddle.updatedAt,
      sources: sourceRows.map((s) => ({
        url: s.url,
        hostname: s.hostname,
        last_verified: s.lastVerified,
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

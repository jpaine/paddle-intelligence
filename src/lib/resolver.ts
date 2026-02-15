/**
 * Resolve field_provenance into paddles table.
 * For each field: latest extracted_at wins, tie-break highest confidence.
 */

import { desc, eq } from "drizzle-orm";
import { db } from "@/src/db";
import { paddles, fieldProvenance } from "@/src/db/schema";

/** Field names in field_provenance that map to paddles columns. */
const PROVENANCE_FIELD_NAMES = [
  "thickness_mm",
  "weight_min_oz",
  "weight_max_oz",
  "face_material",
  "core_material",
  "thermoformed",
  "edge_foam",
  "unibody",
  "injected_foam",
  "msrp_usd",
  "release_year",
  "usap_approved",
  "variant",
  "usap_listing_url",
] as const;

function parseBoolean(val: string | number | null | undefined): boolean {
  if (val == null) return false;
  if (typeof val === "number") return val !== 0;
  const s = String(val).toLowerCase().trim();
  return s === "true" || s === "1" || s === "yes" || s === "y";
}

/**
 * Select best value per field from field_provenance for the given paddle.
 * Order: extracted_at DESC, confidence DESC (NULL last).
 */
export async function applyFieldProvenanceToPaddle(
  paddleId: string
): Promise<void> {
  const rows = await db
    .select()
    .from(fieldProvenance)
    .where(eq(fieldProvenance.paddleId, paddleId))
    .orderBy(
      desc(fieldProvenance.extractedAt),
      desc(fieldProvenance.confidence)
    );

  const byField = new Map<
    string,
    {
      normalizedValueText: string | null;
      normalizedValueNumeric: number | null;
    }
  >();
  for (const row of rows) {
    const key = row.fieldName;
    if (!byField.has(key)) {
      byField.set(key, {
        normalizedValueText: row.normalizedValueText,
        normalizedValueNumeric: row.normalizedValueNumeric,
      });
    }
  }

  const update: {
    thicknessMm?: number | null;
    weightMin?: number | null;
    weightMax?: number | null;
    faceMaterial?: string | null;
    coreMaterial?: string | null;
    thermoformed?: boolean;
    edgeFoam?: boolean;
    unibody?: boolean;
    injectedFoam?: boolean;
    msrpUsd?: number | null;
    releaseYear?: number | null;
    usapApproved?: boolean;
    variant?: string | null;
    usapListingUrl?: string | null;
    updatedAt: Date;
  } = { updatedAt: new Date() };

  for (const fieldName of PROVENANCE_FIELD_NAMES) {
    const chosen = byField.get(fieldName);
    if (!chosen) continue;

    const num = chosen.normalizedValueNumeric;
    const text = chosen.normalizedValueText;

    switch (fieldName) {
      case "thickness_mm":
        if (num != null) update.thicknessMm = num;
        break;
      case "weight_min_oz":
        if (num != null) update.weightMin = num;
        break;
      case "weight_max_oz":
        if (num != null) update.weightMax = num;
        break;
      case "face_material":
        if (text != null && text !== "") update.faceMaterial = text;
        break;
      case "core_material":
        if (text != null && text !== "") update.coreMaterial = text;
        break;
      case "thermoformed":
        update.thermoformed = parseBoolean(text ?? num);
        break;
      case "edge_foam":
        update.edgeFoam = parseBoolean(text ?? num);
        break;
      case "unibody":
        update.unibody = parseBoolean(text ?? num);
        break;
      case "injected_foam":
        update.injectedFoam = parseBoolean(text ?? num);
        break;
      case "msrp_usd":
        if (num != null) update.msrpUsd = num;
        break;
      case "release_year":
        if (num != null) update.releaseYear = Math.floor(num);
        break;
      case "usap_approved":
        update.usapApproved = parseBoolean(text ?? num);
        break;
      case "variant":
        if (text != null && text !== "") update.variant = text;
        break;
      case "usap_listing_url":
        if (text != null && text !== "") update.usapListingUrl = text;
        break;
    }
  }

  await db.update(paddles).set(update).where(eq(paddles.id, paddleId));
}

/**
 * Apply field provenance resolution to all paddles that have at least one field_provenance row.
 */
export async function applyFieldProvenanceToAllPaddles(): Promise<number> {
  const paddleIds = await db
    .selectDistinct({ paddleId: fieldProvenance.paddleId })
    .from(fieldProvenance);
  let count = 0;
  for (const { paddleId } of paddleIds) {
    await applyFieldProvenanceToPaddle(paddleId);
    count++;
  }
  return count;
}

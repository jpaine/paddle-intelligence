/**
 * Helper to insert a field_provenance row for future ingestion.
 * After writing provenance rows, call applyFieldProvenanceToPaddle to refresh paddles.
 */

import { v4 as uuidv4 } from "uuid";
import { db } from "@/src/db";
import { fieldProvenance } from "@/src/db/schema";

export type InsertFieldProvenanceParams = {
  paddleId: string;
  fieldName: string;
  valueText?: string | null;
  normalizedValueText?: string | null;
  normalizedValueNumeric?: number | null;
  unit?: string | null;
  sourceUrl?: string | null;
  sourceId?: string | null;
  confidence?: number | null;
  notes?: string | null;
};

export async function insertFieldProvenance(
  params: InsertFieldProvenanceParams
): Promise<string> {
  const id = uuidv4();
  const now = new Date();
  const confidence =
    params.confidence != null
      ? Math.min(1, Math.max(0, params.confidence))
      : null;

  await db.insert(fieldProvenance).values({
    id,
    paddleId: params.paddleId,
    fieldName: params.fieldName,
    valueText: params.valueText ?? null,
    normalizedValueText: params.normalizedValueText ?? null,
    normalizedValueNumeric: params.normalizedValueNumeric ?? null,
    unit: params.unit ?? null,
    sourceUrl: params.sourceUrl ?? null,
    sourceId: params.sourceId ?? null,
    extractedAt: now,
    confidence,
    notes: params.notes ?? null,
  });

  return id;
}

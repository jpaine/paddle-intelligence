/**
 * Map free-text materials and construction to controlled vocabulary.
 */

export const FACE_MATERIAL_VOCAB = [
  "carbon_fiber_raw",
  "carbon_fiber",
  "fiberglass",
  "graphite",
  "hybrid",
  "other",
] as const;
export type FaceMaterialVocab = (typeof FACE_MATERIAL_VOCAB)[number];

export const CORE_MATERIAL_VOCAB = [
  "polymer_honeycomb",
  "nomex_honeycomb",
  "aluminum_honeycomb",
  "other",
] as const;
export type CoreMaterialVocab = (typeof CORE_MATERIAL_VOCAB)[number];

export type ConstructionFlags = {
  thermoformed: boolean;
  edge_foam: boolean;
  unibody: boolean;
  injected_foam: boolean;
};

const FACE_TERMS: Array<{ pattern: RegExp | string; value: FaceMaterialVocab }> = [
  { pattern: /raw\s*carbon|carbon\s*raw|raw carbon fiber/i, value: "carbon_fiber_raw" },
  { pattern: /carbon\s*fiber|carbon fiber|cf\b/i, value: "carbon_fiber" },
  { pattern: /fiberglass|fiber\s*glass/i, value: "fiberglass" },
  { pattern: /graphite/i, value: "graphite" },
  { pattern: /hybrid/i, value: "hybrid" },
];

const CORE_TERMS: Array<{ pattern: RegExp | string; value: CoreMaterialVocab }> = [
  { pattern: /polymer\s*honeycomb|polymer core|polycore|polymer/i, value: "polymer_honeycomb" },
  { pattern: /nomex\s*honeycomb|nomex/i, value: "nomex_honeycomb" },
  { pattern: /aluminum\s*honeycomb|aluminum core|aluminium/i, value: "aluminum_honeycomb" },
];

function matchVocab(
  text: string,
  terms: Array<{ pattern: RegExp | string; value: FaceMaterialVocab | CoreMaterialVocab }>
): FaceMaterialVocab | CoreMaterialVocab | null {
  const lower = text.toLowerCase().trim();
  for (const { pattern, value } of terms) {
    const re = typeof pattern === "string" ? new RegExp(pattern, "i") : pattern;
    if (re.test(lower)) return value as FaceMaterialVocab & CoreMaterialVocab;
  }
  return null;
}

export function normalizeFaceMaterial(input: string | null | undefined): FaceMaterialVocab {
  if (input == null || String(input).trim() === "") return "other";
  const v = matchVocab(String(input), FACE_TERMS);
  return (v as FaceMaterialVocab) ?? "other";
}

export function normalizeCoreMaterial(input: string | null | undefined): CoreMaterialVocab {
  if (input == null || String(input).trim() === "") return "other";
  const v = matchVocab(String(input), CORE_TERMS);
  return (v as CoreMaterialVocab) ?? "other";
}

export function normalizeConstructionFlags(input: string | null | undefined): ConstructionFlags {
  const out: ConstructionFlags = {
    thermoformed: false,
    edge_foam: false,
    unibody: false,
    injected_foam: false,
  };
  if (input == null || String(input).trim() === "") return out;
  const lower = String(input).toLowerCase();
  if (/\thermoform(ed|ing)?\b/.test(lower)) out.thermoformed = true;
  if (/\bedge\s*foam\b/.test(lower)) out.edge_foam = true;
  if (/\bunibody\b/.test(lower)) out.unibody = true;
  if (/\binject(ed)?\s*foam\b/.test(lower)) out.injected_foam = true;
  return out;
}

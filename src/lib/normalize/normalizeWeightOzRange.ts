/**
 * Parse weight strings (e.g. "8 oz", "7.8-8.2 oz") to min/max oz.
 */

export type WeightOzRangeResult = {
  weightMinOz: number;
  weightMaxOz: number;
} | null;

const OZ_MIN = 6;
const OZ_MAX = 12;

function extractNumberWithUnit(text: string, unitPattern: string): number | null {
  const re = new RegExp(
    `(\\d+(?:\\.\\d+)?)\\s*${unitPattern}`,
    "i"
  );
  const m = text.trim().match(re);
  if (!m) return null;
  const n = parseFloat(m[1]!);
  return Number.isNaN(n) ? null : n;
}

export function normalizeWeightOzRange(input: string | null | undefined): WeightOzRangeResult | null {
  if (input == null || String(input).trim() === "") return null;

  const raw = String(input).trim();

  const rangeRe = /(\d+(?:\.\d+)?)\s*[-–—]\s*(\d+(?:\.\d+)?)\s*(?:oz|ounces?)?/i;
  const rangeM = raw.match(rangeRe);
  if (rangeM) {
    const a = parseFloat(rangeM[1]!);
    const b = parseFloat(rangeM[2]!);
    if (!Number.isNaN(a) && !Number.isNaN(b)) {
      const min = Math.min(a, b);
      const max = Math.max(a, b);
      if (min >= OZ_MIN && max <= OZ_MAX) {
        return { weightMinOz: min, weightMaxOz: max };
      }
    }
  }

  const oz = extractNumberWithUnit(raw, "oz");
  const ounces = extractNumberWithUnit(raw, "ounces?");
  const n = oz ?? ounces;
  if (n != null && n >= OZ_MIN && n <= OZ_MAX) {
    return { weightMinOz: n, weightMaxOz: n };
  }

  const bare = parseFloat(raw.replace(/[^\d.]/g, ""));
  if (!Number.isNaN(bare) && bare >= OZ_MIN && bare <= OZ_MAX) {
    return { weightMinOz: bare, weightMaxOz: bare };
  }

  return null;
}

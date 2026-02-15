/**
 * Parse thickness strings (e.g. "16mm", "16 mm", "0.63 in") to mm.
 * Returns value in mm and unit for provenance.
 */

export type ThicknessResult = {
  valueMm: number;
  unit: string;
} | null;

const MM_MIN = 10;
const MM_MAX = 25;
const INCH_TO_MM = 25.4;

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

export function normalizeThicknessMm(input: string | null | undefined): ThicknessResult | null {
  if (input == null || String(input).trim() === "") return null;

  const raw = String(input).trim();

  const mm = extractNumberWithUnit(raw, "mm");
  if (mm != null && mm >= MM_MIN && mm <= MM_MAX) {
    return { valueMm: Math.round(mm * 10) / 10, unit: "mm" };
  }

  const inch = extractNumberWithUnit(raw, "in\\.?");
  if (inch != null) {
    const mmVal = Math.round(inch * INCH_TO_MM * 10) / 10;
    if (mmVal >= MM_MIN && mmVal <= MM_MAX) {
      return { valueMm: mmVal, unit: "in" };
    }
  }

  const bare = parseFloat(raw.replace(/[^\d.]/g, ""));
  if (!Number.isNaN(bare) && bare >= MM_MIN && bare <= MM_MAX) {
    return { valueMm: Math.round(bare * 10) / 10, unit: "mm" };
  }

  return null;
}

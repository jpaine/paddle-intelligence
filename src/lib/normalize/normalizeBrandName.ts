/**
 * Normalize brand name: trim and apply known aliases.
 */

const BRAND_ALIASES: Record<string, string> = {
  "vactic pro": "Vatic Pro",
  "vactic": "Vatic",
};

export function normalizeBrandName(input: string | null | undefined): string {
  if (input == null) return "";
  const trimmed = input.trim();
  if (!trimmed) return "";
  const key = trimmed.toLowerCase();
  return BRAND_ALIASES[key] ?? trimmed;
}

/**
 * Normalize model name: trim and collapse internal whitespace.
 */

export function normalizeModelName(input: string | null | undefined): string {
  if (input == null) return "";
  return input.trim().replace(/\s+/g, " ");
}

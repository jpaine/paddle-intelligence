/**
 * Generate a URL-safe slug from brand + model (e.g. for paddle lookup).
 */
export function slugify(brand: string, model: string): string {
  const combined = `${brand} ${model}`.trim();
  return combined
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "unknown";
}

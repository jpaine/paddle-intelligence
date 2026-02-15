/**
 * Reusable spec extractor: fetch product page URL, parse HTML with Cheerio,
 * extract thickness, weight, materials, MSRP, etc. Normalizes to a small vocabulary.
 */

import * as cheerio from "cheerio";

const USER_AGENT =
  "PaddleIntelligence/1.0 (research index; public data; +https://pickleballpaddleindex.com)";

export type ExtractedSpecs = {
  thickness: number | null;
  weightMin: number | null;
  weightMax: number | null;
  faceMaterial: string | null;
  coreMaterial: string | null;
  thermoformed: boolean | null;
  msrp: number | null;
  releaseYear: number | null;
};

const FACE_MATERIAL_ALIASES: Record<string, string> = {
  "carbon fiber": "Carbon Fiber",
  carbon: "Carbon Fiber",
  fiberglass: "Fiberglass",
  "fiber glass": "Fiberglass",
  composite: "Composite",
  graphite: "Graphite",
  "nomex": "Nomex Honeycomb",
  "polypropylene": "Polymer",
  polymer: "Polymer",
};

const CORE_MATERIAL_ALIASES: Record<string, string> = {
  "polymer core": "Polymer Core",
  "polymer": "Polymer",
  "nomex honeycomb": "Nomex Honeycomb",
  "nomex": "Nomex",
  foam: "Foam",
  "aluminum": "Polymer",
  "polycore": "Polymer Core",
};

function normalizeFaceMaterial(raw: string): string {
  const key = raw.toLowerCase().trim();
  return FACE_MATERIAL_ALIASES[key] ?? raw.trim();
}

function normalizeCoreMaterial(raw: string): string {
  const key = raw.toLowerCase().trim();
  return CORE_MATERIAL_ALIASES[key] ?? raw.trim();
}

function extractNumberWithUnit(text: string, unit: string): number | null {
  const re = new RegExp(
    `(\\d+(?:\\.\\d+)?)\\s*${unit.replace(/\./g, "\\.")}`,
    "i"
  );
  const m = text.match(re);
  if (!m) return null;
  const n = parseFloat(m[1]!);
  return Number.isNaN(n) ? null : n;
}

function extractThickness(html: string): number | null {
  const mm = extractNumberWithUnit(html, "mm");
  if (mm != null && mm >= 10 && mm <= 25) return mm;
  const inch = extractNumberWithUnit(html, "in\\.?");
  if (inch != null) return Math.round(inch * 25.4 * 10) / 10;
  return null;
}

function extractWeightRange(html: string): {
  weightMin: number | null;
  weightMax: number | null;
} {
  const oz = extractNumberWithUnit(html, "oz");
  const ounces = extractNumberWithUnit(html, "ounces?");
  const n = oz ?? ounces;
  if (n != null && n >= 6 && n <= 12) {
    return { weightMin: n, weightMax: n };
  }
  const rangeRe = /(\d+(?:\.\d+)?)\s*[-–—]\s*(\d+(?:\.\d+)?)\s*(?:oz|ounces?)/i;
  const rangeM = html.match(rangeRe);
  if (rangeM) {
    const a = parseFloat(rangeM[1]!);
    const b = parseFloat(rangeM[2]!);
    if (!Number.isNaN(a) && !Number.isNaN(b))
      return { weightMin: Math.min(a, b), weightMax: Math.max(a, b) };
  }
  return { weightMin: null, weightMax: null };
}

function extractFaceMaterial(html: string): string | null {
  const lower = html.toLowerCase();
  const order = [
    "carbon fiber",
    "fiberglass",
    "fiber glass",
    "graphite",
    "composite",
    "carbon ",
  ];
  for (const term of order) {
    if (lower.includes(term)) {
      const re = new RegExp(
        `(.{0,30}${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}.{0,30})`,
        "i"
      );
      const m = html.match(re);
      const snippet = (m ? m[1] : term).trim();
      const normalized = normalizeFaceMaterial(snippet);
      if (normalized) return normalized;
    }
  }
  return null;
}

function extractCoreMaterial(html: string): string | null {
  const lower = html.toLowerCase();
  const terms = [
    "nomex honeycomb",
    "nomex",
    "polymer core",
    "polycore",
    "polymer",
    "foam",
    "aluminum core",
  ];
  for (const term of terms) {
    if (lower.includes(term)) {
      const normalized = normalizeCoreMaterial(term);
      if (normalized) return normalized;
    }
  }
  return null;
}

function extractThermoformed(html: string): boolean | null {
  const lower = html.toLowerCase();
  if (/\thermoform(ed|ing)?\b/.test(lower)) return true;
  if (/\bnot\s+thermoform/.test(lower)) return false;
  return null;
}

function extractMsrp(html: string): number | null {
  const dollarRe = /\$(\d+(?:,\d{3})*(?:\.\d{2})?)/g;
  const msrpRe = /msrp|price|retail|\$\s*(\d+)/gi;
  const candidates: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = dollarRe.exec(html)) !== null) {
    const n = parseFloat(m[1]!.replace(/,/g, ""));
    if (!Number.isNaN(n) && n >= 10 && n <= 500) candidates.push(n);
  }
  if (candidates.length === 0) return null;
  const msrpIdx = html.search(msrpRe);
  if (msrpIdx >= 0) {
    const snippet = html.slice(Math.max(0, msrpIdx - 50), msrpIdx + 100);
    const snippetMatch = snippet.match(/\$(\d+(?:\.\d{2})?)/);
    if (snippetMatch) {
      const n = parseFloat(snippetMatch[1]!);
      if (n >= 10 && n <= 500) return n;
    }
  }
  return candidates[0] ?? null;
}

function extractReleaseYear(html: string): number | null {
  const yearRe = /\b(20\d{2})\b/g;
  const years: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = yearRe.exec(html)) !== null) {
    const y = parseInt(m[1]!, 10);
    if (y >= 2018 && y <= new Date().getFullYear() + 1) years.push(y);
  }
  if (years.length === 0) return null;
  return Math.max(...years);
}

/**
 * Merge two ExtractedSpecs: prefer non-null from primary, fill nulls from fallback.
 */
function mergeSpecs(primary: ExtractedSpecs, fallback: ExtractedSpecs): ExtractedSpecs {
  return {
    thickness: primary.thickness ?? fallback.thickness,
    weightMin: primary.weightMin ?? fallback.weightMin,
    weightMax: primary.weightMax ?? fallback.weightMax,
    faceMaterial: primary.faceMaterial ?? fallback.faceMaterial,
    coreMaterial: primary.coreMaterial ?? fallback.coreMaterial,
    thermoformed: primary.thermoformed ?? fallback.thermoformed,
    msrp: primary.msrp ?? fallback.msrp,
    releaseYear: primary.releaseYear ?? fallback.releaseYear,
  };
}

/**
 * Fetch URL and extract specs. Tries per-domain overrides first (see spec-extractor-domains.ts),
 * then falls back to generic pattern matching and merges results.
 */
export async function extractSpecsFromUrl(url: string): Promise<ExtractedSpecs> {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    redirect: "follow",
  });
  if (!res.ok) {
    throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  }
  const html = await res.text();
  const { tryDomainExtractor } = await import("./spec-extractor-domains");
  const domainSpecs = tryDomainExtractor(html, url);
  const genericSpecs = extractSpecsFromHtml(html);
  if (domainSpecs) return mergeSpecs(domainSpecs, genericSpecs);
  return genericSpecs;
}

/**
 * Extract specs from raw HTML (e.g. after per-domain fetching or testing).
 * Uses Cheerio to collect text from body and spec tables/lists, then applies pattern matching.
 */
export function extractSpecsFromHtml(html: string): ExtractedSpecs {
  const $ = cheerio.load(html);
  $("script, style, noscript").remove();
  const bodyText = $("body").text();
  const specSelectors = [
    "table",
    "dl",
    "[class*='spec']",
    "[class*='product-detail']",
    "[data-spec]",
  ];
  let combined = bodyText;
  for (const sel of specSelectors) {
    $(sel).each((_, el) => {
      combined += " " + $(el).text();
    });
  }
  const text = combined.replace(/\s+/g, " ");
  const thickness = extractThickness(text);
  const { weightMin, weightMax } = extractWeightRange(text);
  const faceMaterial = extractFaceMaterial(text);
  const coreMaterial = extractCoreMaterial(text);
  const thermoformed = extractThermoformed(text);
  const msrp = extractMsrp(text);
  const releaseYear = extractReleaseYear(text);

  return {
    thickness: thickness ?? null,
    weightMin: weightMin ?? null,
    weightMax: weightMax ?? null,
    faceMaterial: faceMaterial ?? null,
    coreMaterial: coreMaterial ?? null,
    thermoformed,
    msrp: msrp ?? null,
    releaseYear: releaseYear ?? null,
  };
}

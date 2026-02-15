/**
 * Per-domain spec extractors for reliable parsing when generic patterns miss.
 * Add new domains here; use Cheerio selectors or known layout for that brand.
 */

import * as cheerio from "cheerio";
import type { ExtractedSpecs } from "./spec-extractor";

type DomainExtractor = (html: string, url: string) => ExtractedSpecs | null;

function parseNum(s: string): number | null {
  const n = parseFloat(s.replace(/[^0-9.]/g, ""));
  return Number.isNaN(n) ? null : n;
}

function findSpecValue($: cheerio.CheerioAPI, labels: string[]): string | null {
  const text = $("body").text();
  for (const label of labels) {
    const re = new RegExp(
      `${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[:\\s]*([^\\n]+)`,
      "i"
    );
    const m = text.match(re);
    if (m) return m[1]!.trim();
  }
  return null;
}

const DOMAIN_EXTRACTORS: Record<string, DomainExtractor> = {
  "selkirk.com": (html: string) => {
    const $ = cheerio.load(html);
    const specs: ExtractedSpecs = {
      thickness: null,
      weightMin: null,
      weightMax: null,
      faceMaterial: null,
      coreMaterial: null,
      thermoformed: null,
      msrp: null,
      releaseYear: null,
    };
    const thicknessStr = findSpecValue($, ["thickness", "core thickness"]);
    if (thicknessStr) {
      const mm = parseNum(thicknessStr);
      if (mm != null && mm >= 10 && mm <= 25) specs.thickness = mm;
    }
    const weightStr = findSpecValue($, ["weight", "paddle weight"]);
    if (weightStr) {
      const oz = parseNum(weightStr);
      if (oz != null && oz >= 6 && oz <= 12) {
        specs.weightMin = oz;
        specs.weightMax = oz;
      }
    }
    const faceStr = findSpecValue($, ["face", "face material", "surface"]);
    if (faceStr) {
      const lower = faceStr.toLowerCase();
      if (lower.includes("carbon")) specs.faceMaterial = "Carbon Fiber";
      else if (lower.includes("fiberglass")) specs.faceMaterial = "Fiberglass";
      else if (lower.includes("graphite")) specs.faceMaterial = "Graphite";
      else if (lower.includes("composite")) specs.faceMaterial = "Composite";
      else specs.faceMaterial = faceStr;
    }
    const coreStr = findSpecValue($, ["core", "core material"]);
    if (coreStr) {
      const lower = coreStr.toLowerCase();
      if (lower.includes("polymer")) specs.coreMaterial = "Polymer";
      else if (lower.includes("nomex")) specs.coreMaterial = "Nomex Honeycomb";
      else if (lower.includes("foam")) specs.coreMaterial = "Foam";
      else specs.coreMaterial = coreStr;
    }
    const body = $("body").text().toLowerCase();
    if (body.includes("thermoformed")) specs.thermoformed = true;
    if (body.includes("msrp") || body.includes("$")) {
      const m = html.match(/\$(\d+(?:\.\d{2})?)/);
      if (m) {
        const n = parseFloat(m[1]!);
        if (n >= 10 && n <= 500) specs.msrp = n;
      }
    }
    const yearM = html.match(/\b(20\d{2})\b/);
    if (yearM) {
      const y = parseInt(yearM[1]!, 10);
      if (y >= 2018 && y <= new Date().getFullYear() + 1)
        specs.releaseYear = y;
    }
    return specs;
  },

  "joola.com": (html: string) => {
    const $ = cheerio.load(html);
    const specs: ExtractedSpecs = {
      thickness: null,
      weightMin: null,
      weightMax: null,
      faceMaterial: null,
      coreMaterial: null,
      thermoformed: null,
      msrp: null,
      releaseYear: null,
    };
    const thicknessStr = findSpecValue($, ["thickness", "core thickness"]);
    if (thicknessStr) {
      const mm = parseNum(thicknessStr);
      if (mm != null && mm >= 10 && mm <= 25) specs.thickness = mm;
    }
    const weightStr = findSpecValue($, ["weight"]);
    if (weightStr) {
      const oz = parseNum(weightStr);
      if (oz != null && oz >= 6 && oz <= 12) {
        specs.weightMin = oz;
        specs.weightMax = oz;
      }
    }
    const body = $("body").text();
    if (/carbon\s*fiber/i.test(body)) specs.faceMaterial = "Carbon Fiber";
    else if (/fiberglass/i.test(body)) specs.faceMaterial = "Fiberglass";
    else if (/graphite/i.test(body)) specs.faceMaterial = "Graphite";
    if (/nomex/i.test(body)) specs.coreMaterial = "Nomex Honeycomb";
    else if (/polymer/i.test(body)) specs.coreMaterial = "Polymer";
    if (/thermoform/i.test(body)) specs.thermoformed = true;
    const priceM = html.match(/\$(\d+(?:\.\d{2})?)/);
    if (priceM) {
      const n = parseFloat(priceM[1]!);
      if (n >= 10 && n <= 500) specs.msrp = n;
    }
    const yearM = html.match(/\b(20\d{2})\b/);
    if (yearM) {
      const y = parseInt(yearM[1]!, 10);
      if (y >= 2018 && y <= new Date().getFullYear() + 1)
        specs.releaseYear = y;
    }
    return specs;
  },
};

/**
 * Get hostname from URL for domain lookup.
 */
export function getHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/**
 * Try to extract specs using a domain-specific parser if one exists.
 * Returns null if no override for this domain (caller should use generic extractor).
 */
export function tryDomainExtractor(
  html: string,
  url: string
): ExtractedSpecs | null {
  const host = getHostname(url);
  for (const [domain, extract] of Object.entries(DOMAIN_EXTRACTORS)) {
    if (host === domain || host.endsWith("." + domain)) {
      return extract(html, url);
    }
  }
  return null;
}

/**
 * List of domains that have custom extractors (for docs/logging).
 */
export function getDomainOverrideList(): string[] {
  return Object.keys(DOMAIN_EXTRACTORS);
}

/**
 * Fetch ALL USAP paddles by requesting every page in parallel.
 * 4,976 paddles = 200 pages × 25 per page. Uses controlled concurrency.
 */

import * as cheerio from "cheerio";

const BASE_URL = "https://equipment.usapickleball.org/paddle-list/";
const CONCURRENCY = 20;

export type UsapRow = {
  manufacturer: string;
  model: string;
  status: string;
  listDate: string | null;
};

export async function fetchPage(pagenum: number): Promise<UsapRow[]> {
  const url = `${BASE_URL}?pagenum=${pagenum}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "PaddleIntelligence/1.0 (research index; public data)" },
  });
  if (!res.ok) return [];
  const html = await res.text();
  const $ = cheerio.load(html);
  const rows: UsapRow[] = [];
  const links: string[] = [];
  $('a[href*="paddle-list/entry"]').each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const text = $(el).text().trim();
    if (text && !href.includes("pagenum")) links.push(text);
  });
  // Every 3 links = brand, model, date
  for (let i = 0; i + 2 < links.length; i += 3) {
    rows.push({
      manufacturer: links[i] ?? "",
      model: links[i + 1] ?? "",
      status: "Pass",
      listDate: links[i + 2] ?? null,
    });
  }
  return rows.filter((r) => r.manufacturer && r.model);
}

async function runWithLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  let idx = 0;
  async function worker(): Promise<void> {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await fn(items[i]);
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

/**
 * Fetch full list: all pages in parallel (concurrency-limited), dedupe by manufacturer+model.
 */
export async function fetchUsapPaddleListFull(): Promise<UsapRow[]> {
  const totalPages = 200; // 4976 / 25
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages = await runWithLimit(pageNumbers, CONCURRENCY, fetchPage);
  const all = pages.flat();
  // Dedupe by manufacturer+model (same paddle can appear if we parse wrong)
  const seen = new Set<string>();
  return all.filter((r) => {
    const key = `${r.manufacturer}|${r.model}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}


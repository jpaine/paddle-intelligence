/**
 * Fetch USAP approved paddle list from equipment.usapickleball.org (print view).
 * Returns manufacturer, model, status, listDate for each row.
 */

import * as cheerio from "cheerio";

const USAP_PRINT_URL = "https://equipment.usapickleball.org/view/paddle-list-print/";

export type UsapRow = {
  manufacturer: string;
  model: string;
  status: string;
  listDate: string | null;
};

export async function fetchUsapPaddleList(): Promise<UsapRow[]> {
  const res = await fetch(USAP_PRINT_URL, {
    headers: { "User-Agent": "PaddleIntelligence/1.0 (research index; public data)" },
  });
  if (!res.ok) throw new Error(`USAP fetch failed: ${res.status} ${res.statusText}`);
  const html = await res.text();

  const $ = cheerio.load(html);
  const rows: UsapRow[] = [];

  $("table tr").each((_: number, tr) => {
    const $tr = $(tr as Parameters<typeof $>[0]);
    const cells = $tr.find("td").map((__: number, td) => $(td as Parameters<typeof $>[0]).text().trim()).get();
    if (cells.length >= 4) {
      rows.push({
        manufacturer: (cells[0] ?? "").trim(),
        model: (cells[1] ?? "").trim(),
        status: (cells[2] ?? "").trim(),
        listDate: (cells[3] ?? "").trim() || null,
      });
    }
  });

  // If no table found, try parsing markdown-style tables (some proxies return markdown)
  if (rows.length === 0 && html.includes("| Manufacturer |")) {
    const lineRe = /^\|?\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|?\s*$/;
    const lines = html.split(/\r?\n/);
    for (const line of lines) {
      const m = line.match(lineRe);
      if (!m) continue;
      const [, manufacturer, model, status, listDate] = m;
      if (manufacturer && model && !/manufacturer|model name|status|list date/i.test(manufacturer)) {
        rows.push({
          manufacturer: manufacturer.trim(),
          model: model.trim(),
          status: (status ?? "").trim(),
          listDate: (listDate ?? "").trim() || null,
        });
      }
    }
  }

  return rows.filter((r) => r.manufacturer && r.model);
}

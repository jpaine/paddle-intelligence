/**
 * Batch enrichment: for paddles missing specs (e.g. thickness IS NULL),
 * resolve product URL from a mapping CSV, scrape, and upsert.
 * Use modest concurrency and delays to avoid hammering sites.
 */

import "dotenv/config";
import { readFileSync } from "fs";
import { parse } from "csv-parse/sync";
import { v4 as uuidv4 } from "uuid";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "../src/db";
import { paddles, sources, paddleSources } from "../src/db/schema";
import { extractSpecsFromUrl } from "./lib/spec-extractor";

const PADDLE_URLS_CSV = "data/paddle_urls.csv";
const DELAY_MS = 1500;
const DEFAULT_LIMIT = 50;

function getHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function loadUrlMap(): Map<string, string> {
  const csv = readFileSync(PADDLE_URLS_CSV, "utf-8");
  const rows = parse(csv, { columns: true, skip_empty_lines: true }) as Array<{
    slug: string;
    product_url: string;
  }>;
  const map = new Map<string, string>();
  for (const r of rows) {
    if (r.slug?.trim() && r.product_url?.trim()) {
      map.set(r.slug.trim().toLowerCase(), r.product_url.trim());
    }
  }
  return map;
}

async function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const args = process.argv.slice(2);
  let limit = DEFAULT_LIMIT;
  let brandFilter: string | null = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--limit" && args[i + 1]) {
      limit = parseInt(args[i + 1]!, 10) || DEFAULT_LIMIT;
      i++;
    } else if (args[i] === "--brand" && args[i + 1]) {
      brandFilter = args[i + 1]!.trim();
      i++;
    }
  }

  const urlMap = loadUrlMap();
  console.log(`Loaded ${urlMap.size} slug -> URL mapping(s) from ${PADDLE_URLS_CSV}.`);

  const whereClause = brandFilter
    ? and(isNull(paddles.thicknessMm), eq(paddles.brand, brandFilter))
    : isNull(paddles.thicknessMm);

  const rows = await db
    .select({ id: paddles.id, slug: paddles.slug, brand: paddles.brand, model: paddles.model })
    .from(paddles)
    .where(whereClause)
    .limit(limit);
  console.log(`Found ${rows.length} paddle(s) missing thickness.`);

  let processed = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of rows) {
    const url = urlMap.get(row.slug);
    if (!url) {
      skipped++;
      continue;
    }

    const now = new Date();

    try {
      const specs = await extractSpecsFromUrl(url);
      const hostname = getHostname(url);

      const updateSet: {
        updatedAt: Date;
        thicknessMm?: number;
        weightMin?: number;
        weightMax?: number;
        faceMaterial?: string;
        coreMaterial?: string;
        thermoformed?: boolean;
        msrpUsd?: number;
        releaseYear?: number;
      } = { updatedAt: now };
      if (specs.thickness != null) updateSet.thicknessMm = specs.thickness;
      if (specs.weightMin != null) updateSet.weightMin = specs.weightMin;
      if (specs.weightMax != null) updateSet.weightMax = specs.weightMax;
      if (specs.faceMaterial != null) updateSet.faceMaterial = specs.faceMaterial;
      if (specs.coreMaterial != null) updateSet.coreMaterial = specs.coreMaterial;
      if (specs.thermoformed != null) updateSet.thermoformed = specs.thermoformed;
      if (specs.msrp != null) updateSet.msrpUsd = specs.msrp;
      if (specs.releaseYear != null) updateSet.releaseYear = specs.releaseYear;

      await db
        .update(paddles)
        .set(updateSet)
        .where(eq(paddles.id, row.id));

      const [existingSource] = await db
        .select({ id: sources.id })
        .from(sources)
        .where(eq(sources.hostname, hostname));

      const sourceId = existingSource?.id ?? uuidv4();
      if (!existingSource) {
        await db.insert(sources).values({
          id: sourceId,
          baseUrl: url,
          hostname,
          lastVerified: now,
          createdAt: now,
        });
      } else {
        await db
          .update(sources)
          .set({ lastVerified: now })
          .where(eq(sources.id, sourceId));
      }

      await db
        .insert(paddleSources)
        .values({ paddleId: row.id, sourceId, sourceUrl: url, lastVerifiedAt: now })
        .onConflictDoNothing({ target: [paddleSources.paddleId, paddleSources.sourceId] });

      processed++;
      console.log(`Enriched ${row.slug} from ${url}`);
    } catch (e) {
      errors++;
      console.error(`${row.slug} (${url}):`, e);
    }

    await delay(DELAY_MS);
  }

  console.log(`Done. Processed ${processed}, skipped (no URL) ${skipped}, errors ${errors}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

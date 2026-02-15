/**
 * Sync JohnKew Pickleball paddle data into the database.
 * Updates existing paddles (matched by slug) with thickness, weight from JohnKew.
 * Data use is with permission; attribute per their Content Usage Policy.
 *
 * Data source: JOHNKEW_CSV_URL (env) or data/johnkew_paddles.csv (local).
 * CSV should have columns for brand, model, and optionally thickness (mm), weight (oz).
 * Column names are flexible: Brand/brand, Model/model/Paddle Name, Thickness/thickness, Weight/weight.
 */

import "dotenv/config";
import { readFileSync, existsSync } from "fs";
import { parse } from "csv-parse/sync";
import { v4 as uuidv4 } from "uuid";
import { db } from "../src/db";
import { paddles, sources, paddleSources, jobRuns } from "../src/db/schema";
import { eq } from "drizzle-orm";
import { slugify } from "./lib/slug";

const JOHNKEW_SOURCE_URL = "https://www.johnkewpickleball.com/paddle-database";
const JOHNKEW_HOSTNAME = "www.johnkewpickleball.com";
const LOCAL_CSV_PATH = "data/johnkew_paddles.csv";

const USER_AGENT =
  "PaddleIntelligence/1.0 (research index; +https://pickleballpaddleindex.com)";

function pick<T extends Record<string, unknown>>(
  row: T,
  ...keys: string[]
): string | undefined {
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return undefined;
}

function parseNum(val: unknown): number | null {
  if (val == null) return null;
  const s = String(val).replace(/,/g, "").trim();
  const n = parseFloat(s);
  return Number.isNaN(n) ? null : n;
}

async function loadCsv(): Promise<Record<string, string>[]> {
  const url = process.env.JOHNKEW_CSV_URL;
  if (url) {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (!res.ok) throw new Error(`Failed to fetch CSV: ${res.status} ${res.statusText}`);
    const text = await res.text();
    return parse(text, { columns: true, skip_empty_lines: true, relax_column_count: true }) as Record<string, string>[];
  }
  if (existsSync(LOCAL_CSV_PATH)) {
    const text = readFileSync(LOCAL_CSV_PATH, "utf-8");
    return parse(text, { columns: true, skip_empty_lines: true, relax_column_count: true }) as Record<string, string>[];
  }
  throw new Error(
    `No JohnKew data source. Set JOHNKEW_CSV_URL or create ${LOCAL_CSV_PATH} (columns: brand, model, thickness, weight or similar).`
  );
}

async function main() {
  const jobId = uuidv4();
  const startedAt = new Date();
  await db.insert(jobRuns).values({
    id: jobId,
    type: "sync_johnkew",
    status: "running",
    startedAt,
    completedAt: null,
  });

  const rawRows = await loadCsv();
  console.log(`Loaded ${rawRows.length} row(s) from JohnKew source.`);

  const now = new Date();

  const [existingSource] = await db
    .select({ id: sources.id })
    .from(sources)
    .where(eq(sources.hostname, JOHNKEW_HOSTNAME));

  const sourceId = existingSource?.id ?? uuidv4();
  if (!existingSource) {
    await db.insert(sources).values({
      id: sourceId,
      baseUrl: JOHNKEW_SOURCE_URL,
      hostname: JOHNKEW_HOSTNAME,
      lastVerified: now,
      createdAt: now,
    });
  } else {
    await db
      .update(sources)
      .set({ lastVerified: now })
      .where(eq(sources.id, sourceId));
  }

  let updated = 0;
  let skipped = 0;

  for (const row of rawRows) {
    const brand = pick(row, "Brand", "brand", "Manufacturer");
    const model = pick(row, "Model", "model", "Paddle Name", "Paddle", "Name");
    if (!brand || !model) {
      skipped++;
      continue;
    }

    const slug = slugify(brand, model);
    const thickness = parseNum(pick(row, "Thickness", "thickness", "Thickness (mm)", "Core Thickness"));
    const weight = parseNum(pick(row, "Weight", "weight", "Weight (oz)", "Paddle Weight"));
    const weightMin = weight;
    const weightMax = weight;
    if (thickness != null && (thickness < 10 || thickness > 25)) continue;
    if (weight != null && (weight < 6 || weight > 12)) continue;

    const [existing] = await db
      .select({ id: paddles.id })
      .from(paddles)
      .where(eq(paddles.slug, slug));

    if (!existing) {
      skipped++;
      continue;
    }

    const updateSet: {
      updatedAt: Date;
      thicknessMm?: number;
      weightMin?: number;
      weightMax?: number;
    } = { updatedAt: now };
    if (thickness != null) updateSet.thicknessMm = thickness;
    if (weight != null) {
      updateSet.weightMin = weightMin!;
      updateSet.weightMax = weightMax!;
    }

    if (Object.keys(updateSet).length > 1) {
      await db
        .update(paddles)
        .set(updateSet)
        .where(eq(paddles.id, existing.id));
      await db
        .insert(paddleSources)
        .values({ paddleId: existing.id, sourceId, sourceUrl: JOHNKEW_SOURCE_URL, lastVerifiedAt: now })
        .onConflictDoNothing({ target: [paddleSources.paddleId, paddleSources.sourceId] });
      updated++;
    }
  }

  await db
    .update(jobRuns)
    .set({ status: "completed", completedAt: new Date() })
    .where(eq(jobRuns.id, jobId));

  console.log(`JohnKew sync done. Updated ${updated} paddle(s), skipped ${skipped}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

/**
 * Import The Slice Pickleball paddle stats CSV into paddles.
 * Dataset: data/the_slice_paddle_stats.csv
 * Source: https://theslicepickleball.com/pickleball-paddle-database/
 * Maps: Company (brand), Paddle Name (model), Core Thickness (mm), Weight (oz),
 * Face Material, Price (MSRP). Upserts by slug (brand + model).
 */

import "dotenv/config";
import { readFileSync, existsSync } from "fs";
import { parse } from "csv-parse/sync";
import { v4 as uuidv4 } from "uuid";
import { db } from "../src/db";
import { paddles, sources, paddleSources, jobRuns } from "../src/db/schema";
import { eq } from "drizzle-orm";
import { slugify } from "./lib/slug";
import { setStatementTimeoutMs } from "./lib/db-timeout";
import { wrapDatabaseConnectionError } from "../src/lib/db-connect";

const DEFAULT_CSV_PATH = "data/the_slice_paddle_stats.csv";

const THE_SLICE_SOURCE_URL = "https://theslicepickleball.com/pickleball-paddle-database/";

function pick<T extends Record<string, unknown>>(row: T, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return undefined;
}

function parseNum(val: unknown): number | null {
  if (val == null) return null;
  const s = String(val).replace(/,/g, "").replace(/\$/g, "").trim();
  const n = parseFloat(s);
  return Number.isNaN(n) ? null : n;
}

async function loadCsv(): Promise<Record<string, string>[]> {
  const url = process.env.THE_SLICE_CSV_URL;
  if (url) {
    const res = await fetch(url, {
      headers: { "User-Agent": "PaddleIntelligence/1.0 (research index; +https://pickleballpaddleindex.com)" },
    });
    if (!res.ok) throw new Error(`Failed to fetch CSV: ${res.status} ${res.statusText}`);
    const text = (await res.text()).replace(/^\uFEFF/, "");
    return parse(text, { columns: true, skip_empty_lines: true, relax_column_count: true }) as Record<string, string>[];
  }
  const csvPath = process.env.THE_SLICE_CSV ?? DEFAULT_CSV_PATH;
  if (!existsSync(csvPath)) {
    throw new Error(
      `File not found: ${csvPath}. Set THE_SLICE_CSV or THE_SLICE_CSV_URL, or place CSV at default path.`
    );
  }
  const csv = readFileSync(csvPath, "utf-8").replace(/^\uFEFF/, "");
  return parse(csv, { columns: true, skip_empty_lines: true, relax_column_count: true }) as Record<string, string>[];
}

const BATCH_SIZE = 8;
const DELAY_MS = 1500;

function isRetryable(err: unknown): boolean {
  const msg = String(err instanceof Error ? err.message : err);
  const cause = err instanceof Error ? (err as { cause?: { code?: string } }).cause : null;
  return (
    cause?.code === "57014" ||
    msg.includes("statement timeout") ||
    (cause as NodeJS.ErrnoException)?.code === "ETIMEDOUT"
  );
}

async function main() {
  try {
    await setStatementTimeoutMs(120_000); // 2 min per statement
  } catch (e) {
    throw wrapDatabaseConnectionError(e);
  }
  const jobId = uuidv4();
  const startedAt = new Date();
  await db.insert(jobRuns).values({
    id: jobId,
    type: "import_the_slice",
    status: "running",
    startedAt,
    completedAt: null,
  });

  const rows = await loadCsv();
  console.log(`Loaded ${rows.length} row(s) from The Slice Pickleball source.`);

  const sourceUrl = process.env.THE_SLICE_SOURCE_URL ?? THE_SLICE_SOURCE_URL;
  const hostname = "theslicepickleball.com";

  const now = new Date();
  const [existingSource] = await db
    .select({ id: sources.id })
    .from(sources)
    .where(eq(sources.hostname, hostname));

  const sourceId = existingSource?.id ?? uuidv4();
  if (!existingSource) {
    await db.insert(sources).values({
      id: sourceId,
      baseUrl: sourceUrl,
      hostname,
      lastVerified: now,
      createdAt: now,
    });
  } else {
    await db.update(sources).set({ lastVerified: now }).where(eq(sources.id, sourceId));
  }

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  let upserted = 0;
  let skipped = 0;

  const processRow = async (row: Record<string, string>) => {
    const brand = pick(row, "Company", "Brand", "brand");
    const model = pick(row, "Paddle Name", "Paddle Name", "Model", "model");
    if (!brand || !model) {
      skipped++;
      return;
    }
    const slug = slugify(brand, model);
    const thickness = parseNum(pick(row, "Core Thickness (mm)", "Core Thickness (mm)", "Thickness"));
    const weight = parseNum(pick(row, "Weight (oz)", "Weight (oz)", "Weight"));
    const weightMin = weight;
    const weightMax = weight;
    const msrp = parseNum(pick(row, "Price", "Price", "MSRP"));
    const faceMaterial = pick(row, "Face Material", "Face Material");
    if (thickness != null && (thickness < 10 || thickness > 25)) {
      skipped++;
      return;
    }
    if (weight != null && (weight < 6 || weight > 12)) {
      skipped++;
      return;
    }
    const [existing] = await db.select({ id: paddles.id }).from(paddles).where(eq(paddles.slug, slug));
    const paddleId = existing?.id ?? uuidv4();
    if (!existing) {
      await db.insert(paddles).values({
        id: paddleId,
        slug,
        brand,
        model,
        thicknessMm: thickness ?? null,
        weightMin: weightMin ?? null,
        weightMax: weightMax ?? null,
        faceMaterial: faceMaterial ?? null,
        coreMaterial: null,
        thermoformed: false,
        msrpUsd: msrp ?? null,
        releaseYear: null,
        usapApproved: false,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      const updateSet: {
        updatedAt: Date;
        thicknessMm?: number;
        weightMin?: number;
        weightMax?: number;
        faceMaterial?: string | null;
        msrpUsd?: number | null;
      } = { updatedAt: now };
      if (thickness != null) updateSet.thicknessMm = thickness;
      if (weight != null) {
        updateSet.weightMin = weightMin!;
        updateSet.weightMax = weightMax!;
      }
      if (faceMaterial != null) updateSet.faceMaterial = faceMaterial;
      if (msrp != null) updateSet.msrpUsd = msrp;
      await db.update(paddles).set(updateSet).where(eq(paddles.id, paddleId));
    }
    await db
      .insert(paddleSources)
      .values({ paddleId, sourceId, sourceUrl, lastVerifiedAt: now })
      .onConflictDoNothing({ target: [paddleSources.paddleId, paddleSources.sourceId] });
    upserted++;
  };

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const runBatch = async () => {
      for (const row of batch) await processRow(row);
    };
    try {
      await runBatch();
    } catch (err) {
      if (isRetryable(err)) {
        await sleep(3000);
        await runBatch();
      } else throw err;
    }
    if (i + BATCH_SIZE < rows.length) await sleep(DELAY_MS);
  }

  await db
    .update(jobRuns)
    .set({ status: "completed", completedAt: new Date() })
    .where(eq(jobRuns.id, jobId));

  console.log(`The Slice Pickleball import done. Upserted ${upserted}, skipped ${skipped}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

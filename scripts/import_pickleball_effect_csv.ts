/**
 * Import Pickleball Effect Paddle Database CSV into paddles.
 * Dataset: data/pickleball_effect_paddle_database.csv
 * Source: https://docs.google.com/spreadsheets/d/1CsQN9lFJge-QHjBdXE77stTxZHO90RmvXia20YG_JzA/
 * Maps: Brand, Paddle Name, Core Thickness (mm), Weight (oz), Face Material,
 * Price, Year Released, Approval Body (USAP). Upserts by slug (brand + model).
 *
 * Optional: set PICKLEBALL_EFFECT_CSV_URL to fetch CSV from URL (e.g. Google Sheets export)
 * instead of reading a local file.
 */

import "dotenv/config";
import { readFileSync, existsSync } from "fs";
import { parse } from "csv-parse/sync";
import { v4 as uuidv4 } from "uuid";
import { db } from "../src/db";
import { paddles, sources, paddleSources, jobRuns } from "../src/db/schema";
import { eq } from "drizzle-orm";
import { wrapDatabaseConnectionError } from "../src/lib/db-connect";
import { slugify } from "./lib/slug";
import { setStatementTimeoutMs } from "./lib/db-timeout";

const DEFAULT_CSV_PATH = "data/pickleball_effect_paddle_database.csv";

/** Canonical source: Pickleball Effect Paddle Database (Google Sheets). */
const PICKLEBALL_EFFECT_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1CsQN9lFJge-QHjBdXE77stTxZHO90RmvXia20YG_JzA/edit?gid=0#gid=0";

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
  const url = process.env.PICKLEBALL_EFFECT_CSV_URL;
  if (url) {
    const res = await fetch(url, {
      headers: { "User-Agent": "PaddleIntelligence/1.0 (research index; +https://pickleballpaddleindex.com)" },
    });
    if (!res.ok) throw new Error(`Failed to fetch CSV: ${res.status} ${res.statusText}`);
    const text = await res.text();
    return parse(text, { columns: true, skip_empty_lines: true, relax_column_count: true }) as Record<string, string>[];
  }
  const csvPath = process.env.PICKLEBALL_EFFECT_CSV ?? DEFAULT_CSV_PATH;
  if (!existsSync(csvPath)) {
    throw new Error(
      `File not found: ${csvPath}. Set PICKLEBALL_EFFECT_CSV or PICKLEBALL_EFFECT_CSV_URL, or place CSV at default path.`
    );
  }
  const csv = readFileSync(csvPath, "utf-8");
  return parse(csv, { columns: true, skip_empty_lines: true, relax_column_count: true }) as Record<string, string>[];
}

async function main() {
  try {
    await setStatementTimeoutMs(120_000); // 2 min per statement
  } catch (e) {
    throw wrapDatabaseConnectionError(e);
  }
  const jobId = uuidv4();
  const startedAt = new Date();
  try {
    await db.insert(jobRuns).values({
      id: jobId,
      type: "import_pickleball_effect",
      status: "running",
      startedAt,
      completedAt: null,
    });
  } catch (err) {
    throw wrapDatabaseConnectionError(err);
  }

  const rows = await loadCsv();
  console.log(`Loaded ${rows.length} row(s) from Pickleball Effect source.`);

  const sourceUrl =
    process.env.PICKLEBALL_EFFECT_SOURCE_URL ?? PICKLEBALL_EFFECT_SHEET_URL;
  const hostname = "Pickleball Effect";

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

  const BATCH_SIZE = 10;
  const DELAY_MS = 2000;
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const isRetryableError = (e: unknown) => {
    const msg = String(e instanceof Error ? e.message : e);
    const code = (e as NodeJS.ErrnoException)?.code;
    const cause = e instanceof Error ? (e as { cause?: { code?: string } })?.cause : null;
    const pgCode = cause?.code ?? (e as { code?: string })?.code;
    return (
      code === "EHOSTUNREACH" ||
      code === "ETIMEDOUT" ||
      code === "ECONNRESET" ||
      pgCode === "57014" ||
      msg.includes("EHOSTUNREACH") ||
      msg.includes("ETIMEDOUT") ||
      msg.includes("statement timeout")
    );
  };

  let upserted = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const processBatch = async () => {
      for (const row of batch) {
    const brand = pick(row, "Brand", "brand");
    const model = pick(row, "Paddle Name", "Model", "model");
    if (!brand || !model) {
      skipped++;
      continue;
    }

    const slug = slugify(brand, model);
    const thickness = parseNum(pick(row, "Core Thickness (mm)", "Thickness"));
    const weight = parseNum(pick(row, "Weight (oz)", "Weight"));
    const weightMin = weight;
    const weightMax = weight;
    const msrp = parseNum(pick(row, "Price", "MSRP"));
    const releaseYearRaw = parseNum(pick(row, "Year Released"));
    const releaseYear = releaseYearRaw != null && releaseYearRaw >= 1900 && releaseYearRaw <= 2100 ? Math.floor(releaseYearRaw) : null;
    const faceMaterial = pick(row, "Face Material");
    const approvalBody = pick(row, "Approval Body");
    const usapApproved = approvalBody != null && approvalBody.toUpperCase().includes("USAP");

    if (thickness != null && (thickness < 10 || thickness > 25)) continue;
    if (weight != null && (weight < 6 || weight > 12)) continue;

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
        releaseYear,
        usapApproved,
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
        releaseYear?: number | null;
        usapApproved?: boolean;
      } = { updatedAt: now };
      if (thickness != null) updateSet.thicknessMm = thickness;
      if (weight != null) {
        updateSet.weightMin = weightMin!;
        updateSet.weightMax = weightMax!;
      }
      if (faceMaterial != null) updateSet.faceMaterial = faceMaterial;
      if (msrp != null) updateSet.msrpUsd = msrp;
      if (releaseYear != null) updateSet.releaseYear = releaseYear;
      updateSet.usapApproved = usapApproved;
      await db.update(paddles).set(updateSet).where(eq(paddles.id, paddleId));
    }

    await db
      .insert(paddleSources)
      .values({ paddleId, sourceId, sourceUrl, lastVerifiedAt: now })
      .onConflictDoNothing({ target: [paddleSources.paddleId, paddleSources.sourceId] });
    upserted++;
      }
    };
    try {
      await processBatch();
    } catch (err) {
      if (isRetryableError(err) && batch.length > 0) {
        console.warn(`Retryable error (connection/timeout) after row ${i + batch.length}. Retrying batch in 5s...`);
        await sleep(5000);
        await processBatch();
      } else {
        throw err;
      }
    }
    if (i + BATCH_SIZE < rows.length) await sleep(DELAY_MS);
  }

  await db
    .update(jobRuns)
    .set({ status: "completed", completedAt: new Date() })
    .where(eq(jobRuns.id, jobId));

  console.log(`Pickleball Effect import done. Upserted ${upserted}, skipped ${skipped}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

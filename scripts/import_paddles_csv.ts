import "dotenv/config";
import { readFileSync } from "fs";
import { parse } from "csv-parse/sync";
import { v4 as uuidv4 } from "uuid";
import { db } from "../src/db";
import { paddles, sources, paddleSources, jobRuns } from "../src/db/schema";
import { eq } from "drizzle-orm";

const CSV_PATH = "data/paddles_seed.csv";

function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

async function main() {
  const jobId = uuidv4();
  const startedAt = new Date();
  await db.insert(jobRuns).values({
    id: jobId,
    type: "import_csv",
    status: "running",
    startedAt,
    completedAt: null,
  });

  const csv = readFileSync(CSV_PATH, "utf-8");
  const rows = parse(csv, { columns: true, skip_empty_lines: true }) as Array<{
    slug: string;
    brand: string;
    model: string;
    thickness?: string;
    weight_min?: string;
    weight_max?: string;
    face_material?: string;
    core_material?: string;
    thermoformed?: string;
    msrp?: string;
    release_year?: string;
    usap_approved?: string;
    source_url?: string;
  }>;

  let upserted = 0;
  for (const row of rows) {
    if (!row.slug || !row.brand || !row.model) continue;

    const now = new Date();
    const thickness = row.thickness ? parseFloat(row.thickness) : null;
    const weightMin = row.weight_min ? parseFloat(row.weight_min) : null;
    const weightMax = row.weight_max ? parseFloat(row.weight_max) : null;
    const thermoformed = /^(1|true|yes)$/i.test(row.thermoformed ?? "");
    const msrp = row.msrp ? parseFloat(row.msrp) : null;
    const releaseYear = row.release_year ? parseInt(row.release_year, 10) : null;
    const usapApproved = /^(1|true|yes)$/i.test(row.usap_approved ?? "");

    const [existing] = await db
      .select({ id: paddles.id })
      .from(paddles)
      .where(eq(paddles.slug, row.slug));

    const paddleId = existing?.id ?? uuidv4();
    if (!existing) {
      await db.insert(paddles).values({
        id: paddleId,
        slug: row.slug,
        brand: row.brand,
        model: row.model,
        thicknessMm: thickness,
        weightMin,
        weightMax,
        faceMaterial: row.face_material || null,
        coreMaterial: row.core_material || null,
        thermoformed,
        msrpUsd: msrp,
        releaseYear,
        usapApproved,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      await db
        .update(paddles)
        .set({
          brand: row.brand,
          model: row.model,
          thicknessMm: thickness,
          weightMin,
          weightMax,
          faceMaterial: row.face_material || null,
          coreMaterial: row.core_material || null,
          thermoformed,
          msrpUsd: msrp,
          releaseYear,
          usapApproved,
          updatedAt: now,
        })
        .where(eq(paddles.id, paddleId));
    }

    if (row.source_url) {
      const hostname = getHostname(row.source_url);
      const [existingSource] = await db
        .select({ id: sources.id })
        .from(sources)
        .where(eq(sources.hostname, hostname));

      const sourceId = existingSource?.id ?? uuidv4();
      if (!existingSource) {
        await db.insert(sources).values({
          id: sourceId,
          baseUrl: row.source_url,
          hostname,
          lastVerified: now,
          createdAt: now,
        });
      }

      await db
        .insert(paddleSources)
        .values({ paddleId, sourceId, sourceUrl: row.source_url, lastVerifiedAt: now })
        .onConflictDoNothing({
          target: [paddleSources.paddleId, paddleSources.sourceId],
        });
    }
    upserted++;
  }

  await db
    .update(jobRuns)
    .set({ status: "completed", completedAt: new Date() })
    .where(eq(jobRuns.id, jobId));

  console.log(`Imported ${upserted} paddles.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

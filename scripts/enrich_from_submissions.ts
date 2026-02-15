/**
 * Enrich paddles from submissions: for each submission with product_url,
 * fetch the page, extract specs, upsert paddle by slug, and link source.
 * Only sets non-null extracted fields (does not overwrite existing data with null).
 */

import "dotenv/config";
import { v4 as uuidv4 } from "uuid";
import { db } from "../src/db";
import { paddles, sources, paddleSources, submissions } from "../src/db/schema";
import { eq, isNull } from "drizzle-orm";
import { slugify } from "./lib/slug";
import { extractSpecsFromUrl } from "./lib/spec-extractor";

function getHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

async function main() {
  const rows = await db
    .select()
    .from(submissions)
    .where(isNull(submissions.processedAt));
  console.log(`Found ${rows.length} unprocessed submission(s).`);

  let processed = 0;
  let errors = 0;

  for (const row of rows) {
    const url = row.productUrl?.trim();
    if (!url) {
      console.warn(`Submission ${row.id}: no product_url, skipping.`);
      continue;
    }

    const slug = slugify(row.brand, row.model);
    const now = new Date();

    try {
      const specs = await extractSpecsFromUrl(url);
      const hostname = getHostname(url);

      const [existing] = await db
        .select({ id: paddles.id, thicknessMm: paddles.thicknessMm })
        .from(paddles)
        .where(eq(paddles.slug, slug));

      const paddleId = existing?.id ?? uuidv4();

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

      if (!existing) {
        await db.insert(paddles).values({
          id: paddleId,
          slug,
          brand: row.brand,
          model: row.model,
          thicknessMm: specs.thickness ?? null,
          weightMin: specs.weightMin ?? null,
          weightMax: specs.weightMax ?? null,
          faceMaterial: specs.faceMaterial ?? null,
          coreMaterial: specs.coreMaterial ?? null,
          thermoformed: specs.thermoformed ?? false,
          msrpUsd: specs.msrp ?? null,
          releaseYear: specs.releaseYear ?? null,
          usapApproved: false,
          createdAt: now,
          updatedAt: now,
        });
      } else {
        await db
          .update(paddles)
          .set(updateSet)
          .where(eq(paddles.id, paddleId));
      }

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
        .values({ paddleId, sourceId, sourceUrl: url, lastVerifiedAt: now })
        .onConflictDoNothing({ target: [paddleSources.paddleId, paddleSources.sourceId] });

      await db
        .update(submissions)
        .set({ processedAt: now })
        .where(eq(submissions.id, row.id));

      processed++;
      console.log(`Enriched ${slug} from ${url}`);
    } catch (e) {
      errors++;
      console.error(`Submission ${row.id} (${url}):`, e);
    }
  }

  console.log(`Done. Processed ${processed}, errors ${errors}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

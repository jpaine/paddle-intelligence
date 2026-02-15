/**
 * Sync USAP approved paddle list into the database.
 * Fetches all pages in parallel, bulk upserts paddles, links to USAP source.
 */

import "dotenv/config";
import { v4 as uuidv4 } from "uuid";
import { db } from "../src/db";
import { paddles, sources, paddleSources, jobRuns } from "../src/db/schema";
import { eq, sql } from "drizzle-orm";
import { fetchUsapPaddleListFull } from "./fetch_usap_paginated";
import { slugify } from "./lib/slug";

const USAP_SOURCE_URL = "https://equipment.usapickleball.org/paddle-list/";
const USAP_HOSTNAME = "equipment.usapickleball.org";
const BATCH = 100;

async function main() {
  const jobId = uuidv4();
  const startedAt = new Date();
  await db.insert(jobRuns).values({
    id: jobId,
    type: "sync_usap",
    status: "running",
    startedAt,
    completedAt: null,
  });

  console.log("Fetching all USAP pages (parallel)...");
  const rows = await fetchUsapPaddleListFull();
  console.log(`Fetched ${rows.length} paddles.`);

  const now = new Date();

  const [existingSource] = await db
    .select({ id: sources.id })
    .from(sources)
    .where(eq(sources.hostname, USAP_HOSTNAME));

  const sourceId = existingSource?.id ?? uuidv4();
  if (!existingSource) {
    await db.insert(sources).values({
      id: sourceId,
      baseUrl: USAP_SOURCE_URL,
      hostname: USAP_HOSTNAME,
      lastVerified: now,
      createdAt: now,
    });
  } else {
    await db.update(sources).set({ lastVerified: now }).where(eq(sources.id, sourceId));
  }

  let upserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const bySlug = new Map<string, (typeof rows)[0]>();
    for (const r of batch) {
      const slug = slugify(r.manufacturer, r.model);
      if (!bySlug.has(slug)) bySlug.set(slug, r);
    }
    const deduped = Array.from(bySlug.entries()).map(([slug, r]) => ({ ...r, _slug: slug }));
    const values = deduped.map(({ manufacturer: mfr, model: mdl, _slug: slug }) => ({
      id: uuidv4(),
      slug,
      brand: mfr,
      model: mdl,
      thicknessMm: null,
      weightMin: null,
      weightMax: null,
      faceMaterial: null,
      coreMaterial: null,
      thermoformed: false,
      msrpUsd: null,
      releaseYear: null,
      usapApproved: true,
      createdAt: now,
      updatedAt: now,
    }));

    const result = await db
      .insert(paddles)
      .values(values)
      .onConflictDoUpdate({
        target: paddles.slug,
        set: {
          brand: sql`excluded.brand`,
          model: sql`excluded.model`,
          usapApproved: true,
          updatedAt: now,
        },
      })
      .returning({ id: paddles.id });

    const ids = result.map((r) => r.id);
    await db
      .insert(paddleSources)
      .values(ids.map((paddleId) => ({ paddleId, sourceId, sourceUrl: USAP_SOURCE_URL, lastVerifiedAt: now })))
      .onConflictDoNothing({ target: [paddleSources.paddleId, paddleSources.sourceId] });
    upserted += result.length;
  }

  await db
    .update(jobRuns)
    .set({ status: "completed", completedAt: new Date() })
    .where(eq(jobRuns.id, jobId));

  console.log(`Synced ${upserted} paddles from USAP.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

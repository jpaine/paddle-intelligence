# Data sources and enrichment

How paddle data gets into the index and how to add or refresh specs.

## Overview

| Source | What it provides | How to run |
|--------|------------------|------------|
| **USAP sync** | Brand, model, slug, USAP approved (no thickness/weight/materials) | `pnpm run sync:usap` |
| **CSV import** | Full specs for rows in the CSV (upserts by slug) | `pnpm import` |
| **Submissions → enrichment** | Specs scraped from product URLs submitted via the form | `pnpm run enrich:submissions` |
| **Batch enrichment** | Specs scraped using a slug→URL mapping file | `pnpm run enrich:batch` |
| **JohnKew sync** | Thickness, weight from JohnKew Pickleball (with permission) | `pnpm run sync:johnkew` |
| **Pickleball Effect import** | Brand, model, thickness, weight, face material, price, year, USAP from their master CSV | `pnpm run import:pickleball-effect` |
| **The Slice Pickleball import** | Brand, model, thickness, weight, face material, price from their paddle stats CSV | `pnpm run import:slice` |

## 1. USAP sync (listing only)

- **Script:** [scripts/sync_usap.ts](../scripts/sync_usap.ts)
- **Data:** Fetches the full USA Pickleball approved paddle list from equipment.usapickleball.org. Inserts/updates paddles with **brand**, **model**, **slug**, and **usap_approved**. Spec fields (thickness, weight, face/core material, MSRP, etc.) are left null.
- **When:** Run periodically to keep the list and approval status current. Does not overwrite existing spec data.

## 2. CSV import (full specs)

- **Script:** [scripts/import_paddles_csv.ts](../scripts/import_paddles_csv.ts)
- **Data:** Reads [data/paddles_seed.csv](../data/paddles_seed.csv). Upserts paddles by **slug** with all columns (thickness, weight_min, weight_max, face_material, core_material, thermoformed, msrp, release_year, usap_approved, source_url). Also creates `sources` and `paddle_sources` from `source_url`.
- **When:** After adding or editing rows in the CSV. Re-running overwrites existing rows that match slug.

## 3. Enrich from submissions

- **Script:** [scripts/enrich_from_submissions.ts](../scripts/enrich_from_submissions.ts)
- **Data:** Reads rows from the **submissions** table where `processed_at` is null. For each, fetches `product_url`, extracts specs (thickness, weight, materials, MSRP, etc.) via [scripts/lib/spec-extractor.ts](../scripts/lib/spec-extractor.ts), then upserts the paddle by slug (from brand + model) and links the product URL as a source. Sets `processed_at` when done.
- **When:** After new submissions come in. Run locally (or in a scheduled job) with `DATABASE_URL` set. Requires the migration that adds `processed_at` to submissions (`supabase db push` or apply [supabase/migrations/20260213200000_add_submissions_processed_at.sql](../supabase/migrations/20260213200000_add_submissions_processed_at.sql)).

## 4. Batch enrichment (URL mapping)

- **Script:** [scripts/enrich_batch.ts](../scripts/enrich_batch.ts)
- **Mapping:** [data/paddle_urls.csv](../data/paddle_urls.csv) with columns `slug` and `product_url`.
- **Data:** Queries paddles where **thickness** is null (optionally limited by `--limit N` and `--brand "BrandName"`). For each paddle, looks up URL in the mapping; if found, fetches the page, extracts specs, updates the paddle, and adds the URL as a source. Uses a delay between requests to avoid overloading sites.
- **When:** Add slug→URL rows to `data/paddle_urls.csv` for paddles you want to enrich, then run `pnpm run enrich:batch` (optionally with `--limit 50` or `--brand Selkirk`).

## Spec extractor

- **Generic:** [scripts/lib/spec-extractor.ts](../scripts/lib/spec-extractor.ts) — fetches a URL, parses HTML with Cheerio, and looks for thickness (mm), weight (oz), face/core materials, thermoformed, MSRP, and release year using pattern matching and a small normalized vocabulary.
- **Per-domain:** [scripts/lib/spec-extractor-domains.ts](../scripts/lib/spec-extractor-domains.ts) — optional overrides for specific hostnames (e.g. selkirk.com, joola.com) for more reliable parsing. Add new domains there as needed.

## 5. JohnKew Pickleball database

- **Script:** [scripts/sync_johnkew.ts](../scripts/sync_johnkew.ts)
- **Data:** Updates **existing** paddles (matched by slug from brand + model) with thickness (mm) and weight (oz) from JohnKew. Does not create new paddles. Use is with permission; see [Content Usage Policy](https://www.johnkewpickleball.com/content-usage-policy) and attribute on the site.
- **Source:** CSV from [JohnKew Paddle Database](https://www.johnkewpickleball.com/paddle-database). Provide data via:
  - **Option A:** Set `JOHNKEW_CSV_URL` in `.env` to a public CSV URL (e.g. Google Sheets “Publish to web” → CSV link).
  - **Option B:** Export their data to [data/johnkew_paddles.csv](../data/johnkew_paddles.csv) with columns such as `Brand`, `Model`, `Thickness`, `Weight` (column names are flexible).
- **When:** After you have a CSV (from JohnKew export or published sheet). Run `pnpm run sync:johnkew` with `DATABASE_URL` set.

## 6. Pickleball Effect Paddle Database (CSV)

- **Script:** [scripts/import_pickleball_effect_csv.ts](../scripts/import_pickleball_effect_csv.ts)
- **Dataset (local):** `data/pickleball_effect_paddle_database.csv`
- **Source (canonical):** [Pickleball Effect Paddle Database – Google Sheets](https://docs.google.com/spreadsheets/d/1CsQN9lFJge-QHjBdXE77stTxZHO90RmvXia20YG_JzA/edit?gid=0#gid=0)
- **Data:** Maps **Brand**, **Paddle Name** (model), **Core Thickness (mm)**, **Weight (oz)**, **Face Material**, **Price** (MSRP), **Year Released**, **Approval Body** (USAP). Inserts new paddles or updates existing by slug; links all to the “Pickleball Effect” source (Sheet URL by default).
- **Env (optional):**
  - `PICKLEBALL_EFFECT_CSV` = path to local CSV (default: `data/pickleball_effect_paddle_database.csv`).
  - `PICKLEBALL_EFFECT_CSV_URL` = fetch CSV from URL instead of file (e.g. Google Sheets export: `https://docs.google.com/spreadsheets/d/1CsQN9lFJge-QHjBdXE77stTxZHO90RmvXia20YG_JzA/export?format=csv&gid=0`).
  - `PICKLEBALL_EFFECT_SOURCE_URL` = URL stored as source (default: the Sheet link above).
- **When:** Run `pnpm run import:pickleball-effect` with `DATABASE_URL` set. Use local file or set `PICKLEBALL_EFFECT_CSV_URL` to sync from the sheet.

## 7. The Slice Pickleball Paddle Stats (CSV)

- **Script:** [scripts/import_the_slice_csv.ts](../scripts/import_the_slice_csv.ts)
- **Dataset (local):** `data/the_slice_paddle_stats.csv`
- **Source:** [The Slice Pickleball – Paddle Stats Database](https://theslicepickleball.com/pickleball-paddle-database/)
- **Data:** Maps **Company** (brand), **Paddle Name** (model), **Core Thickness (mm)**, **Weight (oz)**, **Face Material**, **Price** (MSRP). Inserts new paddles or updates existing by slug; links all to the “theslicepickleball.com” source. Does not set USAP approval (use USAP sync or other sources for that).
- **Env (optional):**
  - `THE_SLICE_CSV` = path to local CSV (default: `data/the_slice_paddle_stats.csv`).
  - `THE_SLICE_CSV_URL` = fetch CSV from URL instead of file.
  - `THE_SLICE_SOURCE_URL` = URL stored as source (default: the database page above).
- **When:** Run `pnpm run import:slice` with `DATABASE_URL` set.

## Additional databases (not yet integrated)

These sites host paddle databases that could be used as future data sources. Integration would require checking their terms of use and how data is exposed (export, API, or scrape).

| Site | URL | Notes |
|------|-----|--------|
| **Pickleball Base** | [pickleballbase.co/database](https://www.pickleballbase.co/database) | Paddle database; terms and data format would need to be confirmed before integration. |
| **Matt's Pickleball** | [mattspickleball.com/all-paddles](https://www.mattspickleball.com/all-paddles) | Tested/ranked paddles; terms and data format would need to be confirmed before integration. |

To add one as a source: (1) confirm permission or permissive terms, (2) identify how to get data (CSV export, API, or documented scrape), (3) add a sync/import script and document it in this file.

## Field-level provenance and resolver

- **Table:** `field_provenance` stores one row per (paddle, field, source) observation. New ingestion can write to `field_provenance` via the helper in [src/lib/provenance.ts](../src/lib/provenance.ts) (`insertFieldProvenance`).
- **Resolver:** [src/lib/resolver.ts](../src/lib/resolver.ts) — `applyFieldProvenanceToPaddle(paddleId)` chooses the best value per field (latest `extracted_at`, tie-break highest `confidence`) and updates the `paddles` row. Run it after writing provenance for a paddle. `applyFieldProvenanceToAllPaddles()` refreshes all paddles that have provenance rows.
- **Data dictionary:** [docs/data_dictionary.md](data_dictionary.md) describes fields, units, controlled vocabularies, and resolution rules.

## Troubleshooting: ENOTFOUND or database unreachable

If a script fails with **getaddrinfo ENOTFOUND db.xxx.supabase.co** (or ETIMEDOUT):

- **Cause:** `DATABASE_URL` is using the **direct** Supabase host (`db.<ref>.supabase.co`). That host may not resolve when the project is paused (free tier) or from some networks.
- **Fix:** Use the **Connection pooler** URL instead:
  1. Supabase Dashboard → your project → **Project Settings** → **Database**
  2. Under **Connection string**, choose **URI** and **Transaction** mode
  3. Copy the URI (host: `aws-0-<region>.pooler.supabase.com`, port: **6543**, user: `postgres.<PROJECT_REF>`)
  4. Set `DATABASE_URL` in `.env` to that URI and re-run the script

The import script will print this hint when it detects a connection error with a direct URL.

## Applying the submissions migration

If you use the enrich-from-submissions script, ensure the `processed_at` column exists:

```bash
npx supabase db push
```

Or apply the migration file manually: [supabase/migrations/20260213200000_add_submissions_processed_at.sql](../supabase/migrations/20260213200000_add_submissions_processed_at.sql).

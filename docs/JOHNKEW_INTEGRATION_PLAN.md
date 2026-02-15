# JohnKew Pickleball database integration plan

## Source

- **URL:** [https://www.johnkewpickleball.com/paddle-database](https://www.johnkewpickleball.com/paddle-database)
- **Content:** Raw paddle data including metrics such as swing weight, twist weight, balance point, and likely thickness/weight.
- **UI:** Spreadsheet-style (navigate columns, sort by header), suggesting an embedded sheet or similar.

---

## 1. Legal and attribution

**JohnKew’s [Content Usage Policy](https://www.johnkewpickleball.com/content-usage-policy):** Use of their data is subject to their terms; permission has been obtained for this integration. We attribute the source in Methodology and link to their paddle database and Content Usage Policy. The sync script updates existing paddles only and records JohnKew as a source for each updated row.

---

## 2. Discovery: how we get the data

The site does not expose an obvious API or CSV link. Plan for a short discovery phase:

1. **Inspect the paddle-database page**
   - View page source and check for:
     - `<iframe>` with a Google Sheets (or similar) URL.
     - Script tags loading a config that includes a sheet ID or API base URL.
   - In browser DevTools → Network: load the page and filter by XHR/fetch; see if table data is loaded from a known domain (e.g. `docs.google.com`, `airtable.com`, or their own API).

2. **If it’s a published Google Sheet**
   - Common pattern: `https://docs.google.com/spreadsheets/d/{SHEET_ID}/...` with “Publish to web” or a CSV export.
   - Try: `https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=csv&gid={GID}` (or without `gid` for first sheet). Use the same User-Agent and behavior as other scripts (polite, no hammering).

3. **If it’s another provider (Airtable, etc.)**
   - Check for public API or “Export” and document the exact URL and format.

4. **If it’s only in-page (no sheet/API)**
   - Options: (a) ask JohnKew for a CSV/API for integration; (b) do not scrape (policy forbids republishing; scraping would be for republishing).

**Deliverable:** Document the chosen method (e.g. “Google Sheet CSV export URL”) and the column names/format in this doc or in the script’s comments.

---

## 3. Schema mapping

**Our schema today** ([src/db/schema.ts](../src/db/schema.ts)):

- `paddles`: id, slug, brand, model, thickness, weight_min, weight_max, face_material, core_material, thermoformed, msrp, release_year, usap_approved, created_at, updated_at.

**JohnKew advertises:** swing weight, twist weight, balance point (and typically brand, model, and often thickness/weight).

**Mapping strategy:**

- **Use existing columns only (no schema change):**
  - Map: brand, model → slug (via [scripts/lib/slug.ts](../scripts/lib/slug.ts)) for matching.
  - Map: thickness (mm), weight (or min/max) → `thickness`, `weight_min`, `weight_max` if present and numeric.
  - If they expose face/core/thermoformed/MSRP/year, map into the same vocabulary we use elsewhere (see [scripts/lib/spec-extractor.ts](../scripts/lib/spec-extractor.ts) and seed CSV).
  - **Do not** store swing weight, twist weight, or balance in `paddles` (no columns for them yet).

- **Optional later (Phase 2 / paddle_metrics):**
  - If we add a `paddle_metrics` table (per PRD placeholder), add columns or a row for: swing_weight, twist_weight, balance_point, and a `source` (e.g. `johnkew`) so we can attribute and disclaim (e.g. “Lab values, not agency measurements”).

**For this integration:** Implement only the existing-schema mapping; document “future: swing/twist/balance in paddle_metrics” in the script or this plan.

---

## 4. Sync script design

**Location:** e.g. `scripts/sync_johnkew.ts` (or `scripts/enrich_johnkew.ts` if we only ever use it to enrich existing rows).

**Behavior:**

1. **Fetch**
   - If CSV URL (e.g. Google Sheets export): `fetch(URL, { headers: { "User-Agent": "..." } })`, then parse CSV (reuse pattern from [scripts/import_paddles_csv.ts](../scripts/import_paddles_csv.ts) or [scripts/enrich_batch.ts](../scripts/enrich_batch.ts)).
   - If API: same pattern with appropriate endpoint and auth (if they provide a key after permission).

2. **Normalize**
   - For each row: derive `slug = slugify(brand, model)` (normalize brand/model strings if needed: trim, consistent casing).
   - Parse numbers (thickness, weight_min, weight_max, msrp, release_year); skip or coerce invalid values.
   - Normalize face/core to our vocabulary (Carbon Fiber, Polymer, etc.) if JohnKew uses different labels.

3. **Match and upsert**
   - **Option A (recommended):** Only update **existing** paddles. Query `paddles` by `slug` in the normalized list; for each match, build an update object with only **non-null** extracted fields (do not overwrite existing non-null with null). Insert/update `sources` and `paddle_sources` for JohnKew (one source row per run, e.g. URL = `https://www.johnkewpickleball.com/paddle-database`).
   - **Option B:** If we want to add paddles that exist in JohnKew but not in USAP, we could insert new rows; then we must be consistent with slugify and our source attribution (e.g. “JohnKew + USAP” or “JohnKew only”). Prefer Option A for simplicity and to keep USAP as the canonical list.

4. **Source record**
   - `sources`: url = `https://www.johnkewpickleball.com/paddle-database`, hostname = `www.johnkewpickleball.com`, last_verified = now.
   - `paddle_sources`: link each updated paddle to this source so the detail page shows “JohnKew Pickleball” as a source.

5. **Idempotency**
   - Re-running overwrites our DB only with the latest fetched data for the same slugs; no “processed_at” needed unless we add incremental logic later.

6. **Rate limiting / politeness**
   - Single CSV (or a small number of API calls) per run; no per-row HTTP calls. If they have per-paddle URLs later, add a delay between requests (e.g. like [scripts/enrich_batch.ts](../scripts/enrich_batch.ts)).

7. **Logging**
   - Log: rows fetched, rows matched by slug, rows updated, rows skipped (e.g. no slug match, or invalid data). Optionally write a `job_runs` entry with type `sync_johnkew` for observability.

**CLI:** `pnpm run sync:johnkew` (or `enrich:johnkew`) in [package.json](../package.json), running `pnpm tsx scripts/sync_johnkew.ts`. Require `DATABASE_URL` (same as other scripts).

---

## 5. Attribution and methodology

- **Methodology page** ([app/methodology/page.tsx](../app/methodology/page.tsx)):
  - In the “Sources” section, add a short sentence: e.g. “Where we have permission, we also use lab-measured data (e.g. JohnKew Pickleball paddle database) for thickness and weight; see our [Content usage and sources](...) for details.”
  - If we store JohnKew-specific metrics later (swing weight, etc.), add their disclaimer in our own words: e.g. “Lab-derived metrics (e.g. swing weight, twist weight) are from third-party labs and are not agency measurements or statements about legality.”

- **Paddle detail page**
  - Already shows “Sources” with hostname and URL. Once we add the JohnKew source row and link it via `paddle_sources`, “JohnKew Pickleball” will appear there automatically with a link to their paddle-database page.

- **DATA_SOURCES.md**
  - Add a section “JohnKew Pickleball database” describing: what we use it for (thickness, weight, and optionally future metrics), that use is subject to their Content Usage Policy and permission, how to run `pnpm run sync:johnkew`, and where the data is fetched from (CSV URL or API).

---

## 6. Implementation order

| Step | Task | Notes |
|------|------|--------|
| 0 | Obtain permission from JohnKew (email) or confirm public license | **Blocking** for ingestion. |
| 1 | Discovery: identify CSV URL or API and column names | Inspect page source / network; document in this file or script. |
| 2 | Implement `scripts/sync_johnkew.ts` | Fetch, normalize, match by slug, upsert existing paddles only, add source. |
| 3 | Add `sync:johnkew` (or `enrich:johnkew`) to package.json | |
| 4 | Update Methodology + DATA_SOURCES.md | Attribution and how to run. |
| 5 | (Optional) Add paddle_metrics and store swing/twist/balance | Phase 2; include source and disclaimer. |

---

## 7. Risks and constraints

- **Terms:** No ingestion until permission or permissive terms are in place.
- **Data format changes:** If JohnKew changes sheet structure or column names, the script may break; document the expected format and consider a one-line “last tested” note.
- **Duplicate / conflict:** If we already have thickness from CSV or brand scrape, JohnKew update overwrites (by design). If we need “prefer existing” logic, we can add a rule (e.g. only set thickness if currently null) in a later iteration.
- **Attribution:** Always credit JohnKew and link to their paddle-database and content-usage policy; if they specify attribution text, use it.

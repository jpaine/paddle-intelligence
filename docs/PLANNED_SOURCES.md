# Planned data sources (not yet integrated)

Sites we could scrape or integrate next to add more paddle specs. Check terms of use and data format before building.

## Current sources (already integrated)

| Source | Script | Data |
|--------|--------|------|
| USAP | `pnpm run sync:usap` | Brand, model, USAP approved (listing) |
| Seed CSV | `pnpm run import` | Full specs (10 rows) |
| The Slice Pickleball | `pnpm run import:slice` | Brand, model, thickness, weight, face, price |
| Pickleball Effect | `pnpm run import:pickleball-effect` | Brand, model, thickness, weight, face, price, year, USAP |
| JohnKew | `pnpm run sync:johnkew` | Thickness, weight (CSV; use with permission) |
| Submissions + batch | `enrich:submissions`, `enrich:batch` | Specs from product URLs |

## Planned (scrape or API next)

| Site | URL | Next steps |
|------|-----|------------|
| **Pickleball Base** | [pickleballbase.co/database](https://www.pickleballbase.co/database) | (1) Check site ToS and robots.txt. (2) Inspect page: table, API, or export. (3) Add `scripts/import_pickleball_base.ts` (fetch + parse or CSV) and document here. |
| **Matt's Pickleball** | [mattspickleball.com/all-paddles](https://www.mattspickleball.com/all-paddles) | (1) Check ToS. (2) Inspect structure (list/detail pages, API). (3) Add import script; reuse [scripts/lib/spec-extractor.ts](../scripts/lib/spec-extractor.ts) if product URLs are available. |

## How to add a new source

1. **Legal:** Confirm terms of use / permission (e.g. JohnKew-style permission, or permissive ToS).
2. **Data access:** Prefer CSV/API; otherwise use polite scraping (rate limit, User-Agent, no hammering). Reuse `scripts/lib/spec-extractor.ts` and `scripts/lib/spec-extractor-domains.ts` for product-page parsing.
3. **Script:** Add `scripts/import_<source>.ts`: load data → map to paddles schema (slug, brand, model, thicknessMm, weightMin, weightMax, faceMaterial, msrpUsd, etc.) → upsert by slug → insert `sources` and `paddle_sources`.
4. **Docs:** Add a row to the table in [DATA_SOURCES.md](DATA_SOURCES.md) and a script entry with how to run and env vars.

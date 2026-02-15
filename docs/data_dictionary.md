# Data dictionary

Canonical dataset and field-level provenance for the Pickleball Paddle Index.

## Purpose

The **canonical dataset** is the `paddles` table. Values there are either:

1. **Resolved from `field_provenance`** — For each field, the resolver picks one value using: latest `extracted_at` wins, tie-breaker highest `confidence`. The chosen value is written to the corresponding `paddles` column.
2. **Set directly by ingestion** — Scripts may still write to `paddles` (e.g. USAP sync, CSV imports). New ingestion is encouraged to write to `field_provenance` and then run the resolver so the canonical row is updated from provenance.

This document defines each field, units, controlled vocabularies, and resolution rules.

---

## Paddles table

| Column | Type | Unit | Description | Resolved from provenance |
|--------|------|------|-------------|--------------------------|
| id | TEXT | — | UUID primary key | — |
| slug | TEXT | — | Unique identifier (brand + model, slugified) | — |
| brand | TEXT | — | Brand name (normalized) | — |
| model | TEXT | — | Model name (normalized) | — |
| variant | TEXT | — | Variant or sub-model (e.g. "16 mm") | field_name `variant` |
| thickness_mm | REAL | mm | Core thickness | field_name `thickness_mm` |
| weight_min | REAL | oz | Minimum weight | field_name `weight_min_oz` |
| weight_max | REAL | oz | Maximum weight | field_name `weight_max_oz` |
| face_material | TEXT | — | Controlled vocabulary (see below) | field_name `face_material` |
| core_material | TEXT | — | Controlled vocabulary (see below) | field_name `core_material` |
| thermoformed | BOOLEAN | — | Thermoformed construction | field_name `thermoformed` |
| edge_foam | BOOLEAN | — | Edge foam | field_name `edge_foam` |
| unibody | BOOLEAN | — | Unibody construction | field_name `unibody` |
| injected_foam | BOOLEAN | — | Injected foam | field_name `injected_foam` |
| msrp_usd | REAL | USD | Manufacturer suggested retail price | field_name `msrp_usd` |
| release_year | INTEGER | — | Year released | field_name `release_year` |
| usap_approved | BOOLEAN | — | USA Pickleball approved | field_name `usap_approved` |
| usap_listing_url | TEXT | — | URL to USAP listing if applicable | field_name `usap_listing_url` |
| created_at | TIMESTAMPTZ | — | Row creation | — |
| updated_at | TIMESTAMPTZ | — | Last update | Set when resolver runs |

### Resolution rule (from field_provenance)

For each field name (e.g. `thickness_mm`), all rows in `field_provenance` for that paddle and field are ordered by:

1. `extracted_at` DESC (most recent first)
2. `confidence` DESC (higher first; NULL last)

The first row’s `normalized_value_numeric` or `normalized_value_text` (depending on field type) is written to the paddles column.

### Controlled vocabularies

**face_material:** `carbon_fiber_raw` | `carbon_fiber` | `fiberglass` | `graphite` | `hybrid` | `other`

- Raw carbon = raw carbon fiber / peel-ply style; standard carbon = carbon fiber without “raw”.

**core_material:** `polymer_honeycomb` | `nomex_honeycomb` | `aluminum_honeycomb` | `other`

---

## Units

- **Thickness:** millimeters (mm). Valid range typically 10–25 mm.
- **Weight:** ounces (oz). Valid range typically 6–12 oz.
- **MSRP:** US dollars (USD).
- **Dates/timestamps:** ISO 8601 / TIMESTAMPTZ.

---

## Sources table

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | UUID primary key |
| base_url | TEXT | Canonical URL for the source (e.g. database or site root) |
| hostname | TEXT | Hostname (e.g. equipment.usapickleball.org) |
| name | TEXT | Human-readable name (optional) |
| notes | TEXT | Optional notes |
| last_verified | TIMESTAMPTZ | When the source was last checked |
| created_at | TIMESTAMPTZ | Row creation |

---

## Paddle_sources table

Links paddles to sources. Each row is one paddle–source pair.

| Column | Type | Description |
|--------|------|-------------|
| paddle_id | TEXT | FK to paddles.id |
| source_id | TEXT | FK to sources.id |
| source_url | TEXT | Specific URL for this paddle at this source (e.g. product page) |
| last_verified_at | TIMESTAMPTZ | When this specific link was last verified |

**Last verified:** When we successfully fetched or checked this URL for this paddle. Distinct from `sources.last_verified` (source-level).

---

## Field_provenance table

Stores one row per (paddle, field, source) observation. Multiple sources can contribute values for the same field; the resolver picks the best per field.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | UUID primary key |
| paddle_id | TEXT | FK to paddles.id |
| field_name | TEXT | Paddles column name (e.g. thickness_mm, face_material) |
| value_text | TEXT | Raw string as extracted from source |
| normalized_value_text | TEXT | Normalized string (e.g. controlled vocab) |
| normalized_value_numeric | REAL | Normalized number (e.g. thickness in mm, msrp in USD) |
| unit | TEXT | Unit of measure (e.g. mm, oz) |
| source_url | TEXT | URL where value was extracted |
| source_id | TEXT | FK to sources.id (optional) |
| extracted_at | TIMESTAMPTZ | When the value was extracted |
| confidence | REAL | 0–1 (optional); used as tie-breaker after extracted_at |
| notes | TEXT | Optional notes |

**When to use which value:**

- **value_text:** Keep the raw snippet for audit (e.g. "16mm" or "Raw Carbon Fiber").
- **normalized_value_text:** Use for text fields (face_material, core_material, variant, usap_listing_url) and for booleans stored as "true"/"false".
- **normalized_value_numeric:** Use for thickness_mm, weight_min_oz, weight_max_oz, msrp_usd, release_year, and for booleans as 0/1.

**Resolution:** See “Resolution rule” under Paddles table. The resolver reads `field_provenance`, chooses one value per field (latest + confidence), and updates `paddles`.

---

## Ingestion and resolver

1. **New ingestion** should write rows to `field_provenance` (e.g. via `insertFieldProvenance` in `src/lib/provenance.ts`) with the appropriate field_name, value_text, normalized_value_text/numeric, source_url, source_id, and optional confidence.
2. After writing provenance for a paddle, call `applyFieldProvenanceToPaddle(paddleId)` (from `src/lib/resolver.ts`) to refresh the paddles row from provenance.
3. To refresh all paddles that have provenance: `applyFieldProvenanceToAllPaddles()`.

See [DATA_SOURCES.md](DATA_SOURCES.md) for how to run sync/import scripts and where to plug in provenance writes.

# Data sync and monitoring

The index pulls from public sources and can be refreshed on a schedule.

## Data sources

| Source | What we pull | How |
|--------|----------------|-----|
| **USAP** | Approved paddle list (manufacturer, model, status, list date) | Fetch all 200 paginated pages in parallel (~20 concurrent), parse each page, bulk upsert by slug (batches of 100). Gets ~3,100+ paddles in one run. |
| **CSV seed** | Optional extra rows (specs, brand URLs) | `data/paddles_seed.csv` → `pnpm import` |

USAP gives ~1000+ rows from the print page; each paddle is linked to the USAP source. The CSV import adds or updates paddles with thickness, weight, face/core material, and brand URLs.

## Running sync locally

```bash
# Sync USAP list only
pnpm run sync:usap

# Sync USAP then import CSV
pnpm run sync:all
```

Requires `DATABASE_URL` in `.env`.

## Scheduled sync (cron) via GitHub Actions

The repo includes a workflow that runs the sync on a schedule and on manual trigger.

1. **Add secret:** In GitHub → repo **Settings** → **Secrets and variables** → **Actions**, add a secret:
   - Name: `DATABASE_URL`
   - Value: your Supabase connection string (pooler URL for serverless; use the same URL that works for the app).

2. **Schedule:** The workflow runs daily at 06:00 UTC (`.github/workflows/sync.yml`). To change the schedule, edit the `cron` expression.

3. **Manual run:** **Actions** → **Sync paddle data** → **Run workflow**.

4. **Monitoring:** Check the run logs in **Actions**. Failed runs will show in the list and can be re-run.

## Optional: external cron hitting an API

If you prefer a cron service (e.g. cron-job.org) to call your app:

- Vercel serverless functions have a short timeout (~10–60s). Running the full USAP sync (1000+ rows) inside an API route will usually **time out**.
- Recommended: keep using **GitHub Actions** for the heavy sync, or run `pnpm run sync:usap` from a long-running worker/server that has your `DATABASE_URL`.

## Adding more sources

To add another source (e.g. a retailer feed):

1. Add a fetcher in `scripts/` (e.g. `fetch_retailer.ts`) that returns paddle-like rows.
2. Add a sync script that upserts into `paddles` and `sources` / `paddle_sources`.
3. Call that script from `sync:all` or from the GitHub Actions workflow.

Keep one source row per origin (e.g. one for USAP, one per retailer) and link paddles via `paddle_sources` so the UI can show “Source: USAP”, “Source: Brand X”, etc.

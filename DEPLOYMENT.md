# Deployment: Vercel + Supabase

## Prerequisites

- [Supabase account](https://supabase.com)
- [Vercel account](https://vercel.com)
- [Supabase CLI](https://supabase.com/docs/guides/cli/getting-started) (via `pnpm` or `npx`)

## 1. Create Supabase Project (CLI or Dashboard)

### Option A: Via Supabase Dashboard

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Choose org, name, database password, region
4. Wait for project to be created
5. Copy **Connection string** from Project Settings > Database:
   - Use **Connection pooler** (Transaction mode) for serverless
   - Format: `postgresql://postgres.[ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres`

### Option B: Via Supabase CLI

```bash
# Login (opens browser)
npx supabase login

# Create project (requires Supabase account)
npx supabase projects create paddle-intelligence --org-id YOUR_ORG_ID --db-password YOUR_DB_PASSWORD --region us-east-1
```

Then link your local project:

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
```

## 2. Push Migrations to Supabase

```bash
# Set database password for remote (or use SUPABASE_DB_PASSWORD env var)
npx supabase db push
```

This applies `supabase/migrations/*.sql` to your remote database.

## 3. Deploy to Vercel

### Connect Repository

1. Push your code to GitHub/GitLab/Bitbucket
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your repository
4. Framework: Next.js (auto-detected)
5. Root directory: `./` (default)

### Environment Variables

Add these in Vercel Project Settings > Environment Variables:

| Variable | Value | Notes |
|----------|-------|-------|
| `DATABASE_URL` | Your Supabase connection pooler URL | Use Transaction pooler for serverless. If you get "Tenant or user not found", use Data API (below). |
| `SUPABASE_URL` | `https://YOUR_PROJECT_REF.supabase.co` | **Recommended for production.** Enables Data API so the site loads data even when the pooler fails. |
| `SUPABASE_SERVICE_ROLE_KEY` | From Supabase Dashboard → Settings → API → `service_role` (secret) | Required when using `SUPABASE_URL`. Keeps this secret; server-only. |
| `NEXT_PUBLIC_SITE_URL` | `https://your-domain.vercel.app` | Or custom domain |

**Data API fallback:** If the connection pooler returns "Tenant or user not found" (common on new Supabase projects), set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in Vercel. The app will then read paddle data via the Supabase REST API and the live site will show your data without using the pooler.

### Deploy

Vercel will auto-deploy on push. For manual deploy:

```bash
# Install Vercel CLI: pnpm add -g vercel
vercel --prod
```

## 4. Post-Deploy: Seed Data (Optional)

If you have seed data, run the import script locally with production DATABASE_URL:

```bash
DATABASE_URL="your-supabase-pooler-url" pnpm import
```

Or run via a one-off script in your CI/deploy pipeline.

## Local Development with Supabase

```bash
# Start local Supabase (Docker required)
npx supabase start

# Apply migrations locally
npx supabase db push --local

# Get local connection string
npx supabase status
# Use: postgresql://postgres:postgres@127.0.0.1:54322/postgres

# Add to .env:
# DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

## Full CLI runbook (all steps)

From the project root, with Supabase project linked and `.env` containing a working `DATABASE_URL` (direct URL works for local import when pooler fails):

```bash
# 1. Push migrations to remote Supabase
supabase db push

# 2. Seed the database (reads data/paddles_seed.csv)
npm run import

# 3. Set production DATABASE_URL in Vercel (use pooler for serverless)
echo 'postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require' | vercel env add DATABASE_URL production --force

# 4. Deploy to production
vercel --prod --yes
```

Replace `[REF]`, `[PASSWORD]`, and `[REGION]` with your Supabase project ref, database password, and region (e.g. `us-east-1`). If the pooler returns "Tenant or user not found", use the direct URL in `.env` for `npm run import` only; Vercel must use the pooler (direct DB host does not resolve from Vercel's network). Check `/api/health` for `cause` when debugging.

## Troubleshooting

- **Connection refused**: Ensure DATABASE_URL uses the pooler (port 6543) not direct (5432) for serverless.
- **Tenant or user not found** (pooler): New projects can take time to propagate; try again later or check Supabase Dashboard > Pooler logs. Use direct URL only for local import.
- **ENOTFOUND db.xxx.supabase.co**: Direct DB host is not reachable from Vercel; use the pooler URL in Vercel.
- **Migration conflicts**: Run `npx supabase migration list` to check sync.
- **Build fails**: Ensure DATABASE_URL is set in Vercel (can be empty for build if app doesn't require it at build time).

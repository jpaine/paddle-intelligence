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
| `DATABASE_URL` | Your Supabase connection pooler URL | Required. Use Transaction pooler for serverless. |
| `NEXT_PUBLIC_SITE_URL` | `https://your-domain.vercel.app` | Or custom domain |

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

## Troubleshooting

- **Connection refused**: Ensure DATABASE_URL uses the pooler (port 6543) not direct (5432) for serverless.
- **Migration conflicts**: Run `npx supabase migration list` to check sync.
- **Build fails**: Ensure DATABASE_URL is set in Vercel (can be empty for build if app doesn't require it at build time).

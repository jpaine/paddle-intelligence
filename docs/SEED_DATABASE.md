# Why you see 0 paddles / 0 brands

The app is wired to Supabase and the schema is applied. You see 0 paddles if (1) **no rows have been loaded** into the `paddles` table, or (2) the **deployed app cannot reach the database** (wrong or blocked connection).

## 1. Check if the database is reachable

- **Production:** Open  
  `https://paddle-intelligence.vercel.app/api/health`  
  You should get JSON with `database: "connected"` and `paddles` / `brands` counts, or `database: "error"` / timeout.
- If you see **"error"** or **timeout**, the deployed app cannot connect. Use **Step 2** and **Step 3** (connection string and Vercel env).

## 2. Supabase connection strings (pooler vs direct)

Supabase offers two connection types:

- **Connection pooler (Transaction mode)**  
  - **URI:** `postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres`  
  - **Use for:** Vercel and other serverless (recommended for production).  
  - If you get **"Tenant or user not found"**: project may be paused (resume in Dashboard), or credentials/format wrong. Check [Pooler logs](https://supabase.com/dashboard/project/_/logs/pooler) and ensure user is `postgres.[PROJECT-REF]` and password is URL-encoded if it has special characters.

- **Direct connection**  
  - **URI:** `postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`  
  - **Use for:** Local scripts (e.g. `pnpm import`) when the pooler fails with "Tenant or user not found".  
  - **Note:** Supabase may not allow direct connections from external IPs (e.g. Vercel). If the live site still shows 0 paddles after setting direct URL in Vercel, use the pooler for production and fix pooler auth/project status.

Get both from: [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Project Settings** → **Database** → **Connection string** (URI).

## 3. Set environment variables in Vercel

So the **deployed** app can read from the same database:

1. [Vercel Dashboard](https://vercel.com) → your **paddle-intelligence** project.
2. **Settings** → **Environment Variables**.

**Option A – Data API (recommended when pooler fails)**  
If the pooler returns "Tenant or user not found", use the Supabase Data API instead:

- **SUPABASE_URL:** `https://YOUR_PROJECT_REF.supabase.co` (e.g. `https://woarfwndyghqjygqkqlc.supabase.co`)
- **SUPABASE_SERVICE_ROLE_KEY:** From [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Settings** → **API** → **Project API keys** → copy the `service_role` key (secret).

The app will then read paddle data via the REST API and the live site will show your data.

**Option B – Postgres pooler**  
If the pooler works for your project:

- **DATABASE_URL:** Your Supabase connection pooler URL (Transaction mode, user `postgres.[PROJECT-REF]`).

4. Save and **redeploy** (Deployments → … → Redeploy, or push a commit).

## 4. Load seed data (paddles and brands)

1. In the project root, create or update **.env** with a working Supabase URL (pooler or direct; direct often works for local import when pooler fails):
   ```bash
   # Pooler (use if it works)
   DATABASE_URL="postgresql://postgres.woarfwndyghqjygqkqlc:YOUR_PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
   # Or direct (if pooler gives "Tenant or user not found")
   # DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.woarfwndyghqjygqkqlc.supabase.co:5432/postgres"
   ```
2. From the project root, run:
   ```bash
   pnpm import
   ```
   This reads **data/paddles_seed.csv** and upserts paddles and sources into Supabase.
3. Refresh the site and `/api/health`. You should see 10 paddles and multiple brands **if** the app can connect to the same database (same URL in Vercel and successful health check).

## 5. Data sources and enrichment

For how the index gets full specs (thickness, weight, materials) and how to run the USAP sync, CSV import, submission enrichment, and batch enrichment scripts, see **[DATA_SOURCES.md](DATA_SOURCES.md)**.

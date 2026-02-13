# Project: Pickleball Paddle Index

## Vision

Build a research-grade, public-data-only platform that serves as the canonical index of commercial pickleball paddles.

This is NOT a review blog.
This is NOT influencer content.
This is infrastructure.

The site must:
- Index paddles with structured specs
- Show transparent data sources
- Support filtering + sorting
- Be SEO optimized for "pickleball paddle"
- Be deployable on Vercel
- Be easily extensible for research layers (indices, NLP, reports)

---

# Tech Stack

- Next.js 14 (App Router)
- TypeScript
- TailwindCSS (minimal, clean design)
- Drizzle ORM
- Supabase (PostgreSQL)
- Zod validation
- Recharts (future phase)
- Vercel deployment

---

# Core Pages

## 1. Homepage "/"

SEO Title:
"Pickleball Paddle Index – Data & Analytics on Commercial Pickleball Paddles"

Meta Description:
"Explore structured data on commercial pickleball paddles including thickness, core material, construction type, and pricing. Independent, public-data research platform."

Sections:
- Hero with title + short description
- Stats:
  - total paddles
  - total brands
  - last updated timestamp
- CTA buttons:
  - Explore Database
  - Methodology
  - Submit a Paddle
- Short explanation of transparency + public data

---

## 2. Database Page "/paddles"

Features:
- Filter sidebar:
  - brand
  - thickness bucket (<=13, 14, 16, >=18)
  - face material
  - core material
  - thermoformed (yes/no)
  - USAP approved (yes/no)
- Sorting:
  - brand
  - thickness
  - msrp
- Pagination
- Table layout

Columns:
- Brand
- Model
- Thickness
- Weight range
- Face material
- Core material
- USAP badge

Each row links to detail page.

---

## 3. Paddle Detail "/paddles/[slug]"

Header:
Brand + Model

Spec block:
- Thickness (mm)
- Weight range
- Face material
- Core material
- Thermoformed
- MSRP
- Release year
- USAP status

Sources section:
- List source URLs
- Hostname label
- last verified

Footer disclaimer:
"This page is generated from publicly available data. If you are a brand and would like to update information, submit via the form."

---

## 4. Methodology Page "/methodology"

Explain:
- Public data only
- Sources (USAP listings, brand pages, retailer listings)
- No manual testing
- Data normalization approach
- Limitations
- Update policy

Must read like a research document.

---

## 5. Submit Page "/submit"

Form fields:
- brand
- model
- product_url (required)
- contact_email (optional)
- notes (optional)

POST to /api/submit
Store in submissions table
Return success message

---

# Database Schema

Implement using Drizzle + SQLite.

Tables:

- paddles
- sources
- paddle_sources
- submissions
- job_runs

Use UUID strings for IDs.

Slug unique.

---

# Schema Code (Use Exactly)

<INSERT SAME SCHEMA BLOCK FROM PREVIOUS MESSAGE HERE>

---

# API Routes

## GET /api/paddles
Supports query params:
- brand
- thickness_min
- thickness_max
- face_material
- core_material
- thermoformed
- usap_approved
- sort
- order
- limit
- offset

Returns:
{
  items: PaddleSummary[],
  total: number
}

## GET /api/paddles/[id]

Return full paddle + associated sources.

## POST /api/submit

Validate with Zod.
Insert into submissions.

---

# CSV Import Script

Create:
scripts/import_paddles_csv.ts

Reads:
data/paddles_seed.csv

Upserts:
- paddles by slug
- creates source entries by hostname
- creates paddle_sources entries

Run with:
pnpm tsx scripts/import_paddles_csv.ts

---

# SEO Requirements

- Each paddle page must have:
  - dynamic title:
    "{Brand} {Model} – Pickleball Paddle Index"
  - meta description using thickness + material
- Structured JSON-LD:
  - Product schema
  - name
  - brand
  - description
  - offers (msrp if exists)

---

# Styling

- Minimal
- White background
- Dark navy headings
- Clean tables
- No influencer vibe
- No gradients
- No animations

Feels like:
Financial terminal × research platform.

---

# Environment Variables

DATABASE_URL=  # Supabase connection pooler URL (Transaction mode)
NEXT_PUBLIC_SITE_URL=https://pickleballpaddleindex.com

---

# Deployment

- Deploy on Vercel
- Connect Supabase database (see DEPLOYMENT.md)
- Add environment variables (DATABASE_URL, NEXT_PUBLIC_SITE_URL)
- Run migrations: `npx supabase db push`
- Import CSV: `pnpm import`

---

# Phase 2 Placeholder (Do Not Implement Yet)

Add:
- paddle_metrics table
- novelty score
- clustering
- rankings page

Keep schema extensible.

---

# Success Criteria

After deploy:

User can:
- Browse paddles
- Filter
- Click detail
- See transparent sources
- Submit new paddle

Site must:
- Be fast
- Be SEO clean
- Feel authoritative


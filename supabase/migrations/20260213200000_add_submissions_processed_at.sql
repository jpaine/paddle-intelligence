-- Add processed_at to submissions for enrichment script (skip already processed)
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;

-- Layer 1: Canonical dataset (provenance-first)
-- Paddles: canonical field names + variant, usap_listing_url, construction flags
-- Sources: base_url, name, notes
-- Paddle_sources: source_url, last_verified_at
-- New: field_provenance

-- 1.1 Paddles
ALTER TABLE paddles RENAME COLUMN thickness TO thickness_mm;
ALTER TABLE paddles RENAME COLUMN msrp TO msrp_usd;
ALTER TABLE paddles ADD COLUMN IF NOT EXISTS variant TEXT;
ALTER TABLE paddles ADD COLUMN IF NOT EXISTS usap_listing_url TEXT;
ALTER TABLE paddles ADD COLUMN IF NOT EXISTS edge_foam BOOLEAN DEFAULT FALSE;
ALTER TABLE paddles ADD COLUMN IF NOT EXISTS unibody BOOLEAN DEFAULT FALSE;
ALTER TABLE paddles ADD COLUMN IF NOT EXISTS injected_foam BOOLEAN DEFAULT FALSE;

-- 1.2 Sources
ALTER TABLE sources RENAME COLUMN url TO base_url;
ALTER TABLE sources ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE sources ADD COLUMN IF NOT EXISTS notes TEXT;

-- 1.3 Paddle_sources
ALTER TABLE paddle_sources ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE paddle_sources ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ;

-- 1.4 Field_provenance
CREATE TABLE IF NOT EXISTS field_provenance (
  id TEXT PRIMARY KEY,
  paddle_id TEXT NOT NULL REFERENCES paddles(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  value_text TEXT,
  normalized_value_text TEXT,
  normalized_value_numeric REAL,
  unit TEXT,
  source_url TEXT,
  source_id TEXT REFERENCES sources(id) ON DELETE SET NULL,
  extracted_at TIMESTAMPTZ NOT NULL,
  confidence REAL,
  notes TEXT,
  CONSTRAINT field_provenance_confidence_range CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1))
);
CREATE INDEX IF NOT EXISTS idx_field_provenance_paddle_field ON field_provenance(paddle_id, field_name);

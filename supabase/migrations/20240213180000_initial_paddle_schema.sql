-- Paddles index schema for Pickleball Paddle Index

CREATE TABLE paddles (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  thickness REAL,
  weight_min REAL,
  weight_max REAL,
  face_material TEXT,
  core_material TEXT,
  thermoformed BOOLEAN DEFAULT FALSE,
  msrp REAL,
  release_year INTEGER,
  usap_approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE sources (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  hostname TEXT NOT NULL,
  last_verified TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE paddle_sources (
  paddle_id TEXT NOT NULL REFERENCES paddles(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  PRIMARY KEY (paddle_id, source_id)
);

CREATE TABLE submissions (
  id TEXT PRIMARY KEY,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  product_url TEXT NOT NULL,
  contact_email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE job_runs (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ
);

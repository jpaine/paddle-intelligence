import {
  pgTable,
  text,
  integer,
  real,
  boolean,
  primaryKey,
  timestamp,
} from "drizzle-orm/pg-core";

export const paddles = pgTable("paddles", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  brand: text("brand").notNull(),
  model: text("model").notNull(),
  variant: text("variant"),
  thicknessMm: real("thickness_mm"),
  weightMin: real("weight_min"),
  weightMax: real("weight_max"),
  faceMaterial: text("face_material"),
  coreMaterial: text("core_material"),
  thermoformed: boolean("thermoformed").default(false),
  edgeFoam: boolean("edge_foam").default(false),
  unibody: boolean("unibody").default(false),
  injectedFoam: boolean("injected_foam").default(false),
  msrpUsd: real("msrp_usd"),
  releaseYear: integer("release_year"),
  usapApproved: boolean("usap_approved").default(false),
  usapListingUrl: text("usap_listing_url"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const sources = pgTable("sources", {
  id: text("id").primaryKey(),
  baseUrl: text("base_url").notNull(),
  hostname: text("hostname").notNull(),
  name: text("name"),
  notes: text("notes"),
  lastVerified: timestamp("last_verified"),
  createdAt: timestamp("created_at").notNull(),
});

export const paddleSources = pgTable(
  "paddle_sources",
  {
    paddleId: text("paddle_id")
      .notNull()
      .references(() => paddles.id, { onDelete: "cascade" }),
    sourceId: text("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    sourceUrl: text("source_url"),
    lastVerifiedAt: timestamp("last_verified_at"),
  },
  (t) => [primaryKey({ columns: [t.paddleId, t.sourceId] })]
);

export const fieldProvenance = pgTable(
  "field_provenance",
  {
    id: text("id").primaryKey(),
    paddleId: text("paddle_id")
      .notNull()
      .references(() => paddles.id, { onDelete: "cascade" }),
    fieldName: text("field_name").notNull(),
    valueText: text("value_text"),
    normalizedValueText: text("normalized_value_text"),
    normalizedValueNumeric: real("normalized_value_numeric"),
    unit: text("unit"),
    sourceUrl: text("source_url"),
    sourceId: text("source_id").references(() => sources.id, {
      onDelete: "set null",
    }),
    extractedAt: timestamp("extracted_at").notNull(),
    confidence: real("confidence"),
    notes: text("notes"),
  }
);

export const submissions = pgTable("submissions", {
  id: text("id").primaryKey(),
  brand: text("brand").notNull(),
  model: text("model").notNull(),
  productUrl: text("product_url").notNull(),
  contactEmail: text("contact_email"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull(),
  processedAt: timestamp("processed_at"),
});

export const jobRuns = pgTable("job_runs", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  status: text("status").notNull(),
  startedAt: timestamp("started_at").notNull(),
  completedAt: timestamp("completed_at"),
});

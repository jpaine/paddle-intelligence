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
  thickness: real("thickness"),
  weightMin: real("weight_min"),
  weightMax: real("weight_max"),
  faceMaterial: text("face_material"),
  coreMaterial: text("core_material"),
  thermoformed: boolean("thermoformed").default(false),
  msrp: real("msrp"),
  releaseYear: integer("release_year"),
  usapApproved: boolean("usap_approved").default(false),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const sources = pgTable("sources", {
  id: text("id").primaryKey(),
  url: text("url").notNull(),
  hostname: text("hostname").notNull(),
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
  },
  (t) => [primaryKey({ columns: [t.paddleId, t.sourceId] })]
);

export const submissions = pgTable("submissions", {
  id: text("id").primaryKey(),
  brand: text("brand").notNull(),
  model: text("model").notNull(),
  productUrl: text("product_url").notNull(),
  contactEmail: text("contact_email"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull(),
});

export const jobRuns = pgTable("job_runs", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  status: text("status").notNull(),
  startedAt: timestamp("started_at").notNull(),
  completedAt: timestamp("completed_at"),
});

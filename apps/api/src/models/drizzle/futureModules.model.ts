import { index, integer, pgEnum, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

import { timestamps } from "../../databases/drizzle/helpers";
import { users } from "./authentication.model";
import { diveSpots } from "./diveSpots.model";

export const COMPETITIVE_RECORD_VERIFICATION = pgEnum("competitive_record_verification", ["UNVERIFIED", "VERIFIED", "REJECTED"]);

export const competitiveRecords = pgTable(
  "competitive_records",
  {
    id: serial("id").primaryKey(),
    submittedByUserId: integer("submitted_by_user_id").references(() => users.id, { onDelete: "set null" }),
    athleteName: varchar("athlete_name", { length: 120 }).notNull(),
    discipline: varchar("discipline", { length: 30 }).notNull(),
    resultValue: varchar("result_value", { length: 50 }).notNull(),
    resultUnit: varchar("result_unit", { length: 20 }).notNull(),
    eventName: varchar("event_name", { length: 200 }).notNull(),
    eventDate: timestamp("event_date", { withTimezone: true }).notNull(),
    sourceUrl: text("source_url"),
    diveSpotId: integer("dive_spot_id").references(() => diveSpots.id, { onDelete: "set null" }),
    verificationState: COMPETITIVE_RECORD_VERIFICATION("verification_state").default("UNVERIFIED").notNull(),
    verificationNote: text("verification_note"),
    verifiedByUserId: integer("verified_by_user_id").references(() => users.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (table) => ({
    athleteIdx: index("competitive_records_athlete_idx").on(table.athleteName),
    eventIdx: index("competitive_records_event_idx").on(table.eventName),
    disciplineIdx: index("competitive_records_discipline_idx").on(table.discipline),
    diveSpotIdx: index("competitive_records_dive_spot_idx").on(table.diveSpotId),
  }),
);

export const TRAINING_LOG_VISIBILITY = pgEnum("training_log_visibility", ["PRIVATE", "BUDDIES_ONLY", "PUBLIC"]);

export const trainingLogSessions = pgTable(
  "training_log_sessions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 200 }).notNull(),
    notes: text("notes"),
    sessionDate: timestamp("session_date", { withTimezone: true }).notNull(),
    visibility: TRAINING_LOG_VISIBILITY("visibility").default("PRIVATE").notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => ({
    userDateIdx: index("training_log_sessions_user_date_idx").on(table.userId, table.sessionDate),
  }),
);

export const trainingLogMetrics = pgTable("training_log_metrics", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => trainingLogSessions.id, { onDelete: "cascade" }),
  metricKey: varchar("metric_key", { length: 80 }).notNull(),
  metricValue: varchar("metric_value", { length: 120 }).notNull(),
  metricUnit: varchar("metric_unit", { length: 20 }),
  ...timestamps,
});

export const safetyPages = pgTable("safety_pages", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 120 }).unique().notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  content: text("content").notNull(),
  isPublished: integer("is_published").default(0),
  lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }),
  updatedByUserId: integer("updated_by_user_id").references(() => users.id, { onDelete: "set null" }),
  ...timestamps,
});

export const safetyPageVersions = pgTable("safety_page_versions", {
  id: serial("id").primaryKey(),
  safetyPageId: integer("safety_page_id")
    .notNull()
    .references(() => safetyPages.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 200 }).notNull(),
  content: text("content").notNull(),
  updatedByUserId: integer("updated_by_user_id").references(() => users.id, { onDelete: "set null" }),
  ...timestamps,
});

export const safetyContacts = pgTable("safety_contacts", {
  id: serial("id").primaryKey(),
  region: varchar("region", { length: 100 }).notNull(),
  label: varchar("label", { length: 120 }).notNull(),
  phone: varchar("phone", { length: 60 }).notNull(),
  source: text("source").notNull(),
  isPublished: integer("is_published").default(1),
  ...timestamps,
});

export const awarenessPosts = pgTable(
  "awareness_posts",
  {
    id: serial("id").primaryKey(),
    authorUserId: integer("author_user_id").references(() => users.id, { onDelete: "set null" }),
    title: varchar("title", { length: 200 }).notNull(),
    body: text("body").notNull(),
    topicType: varchar("topic_type", { length: 50 }).notNull(),
    sourceUrl: text("source_url"),
    isPublished: integer("is_published").default(1),
    ...timestamps,
  },
  (table) => ({
    topicIdx: index("awareness_posts_topic_idx").on(table.topicType),
  }),
);

export const MARKETPLACE_LISTING_STATE = pgEnum("marketplace_listing_state", ["ACTIVE", "FLAGGED", "REMOVED"]);

export const marketplaceListings = pgTable(
  "marketplace_listings",
  {
    id: serial("id").primaryKey(),
    sellerUserId: integer("seller_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    item: varchar("item", { length: 160 }).notNull(),
    condition: varchar("condition", { length: 50 }).notNull(),
    price: varchar("price", { length: 40 }).notNull(),
    region: varchar("region", { length: 100 }).notNull(),
    description: text("description"),
    photos: text("photos").array(),
    state: MARKETPLACE_LISTING_STATE("state").default("ACTIVE").notNull(),
    ...timestamps,
  },
  (table) => ({
    sellerIdx: index("marketplace_listings_seller_idx").on(table.sellerUserId),
    stateRegionIdx: index("marketplace_listings_state_region_idx").on(table.state, table.region),
  }),
);

export const collaborationPosts = pgTable(
  "collaboration_posts",
  {
    id: serial("id").primaryKey(),
    authorUserId: integer("author_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    postType: varchar("post_type", { length: 30 }).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    body: text("body").notNull(),
    region: varchar("region", { length: 120 }),
    specialty: varchar("specialty", { length: 120 }),
    isActive: integer("is_active").default(1),
    ...timestamps,
  },
  (table) => ({
    authorIdx: index("collaboration_posts_author_idx").on(table.authorUserId),
    typeIdx: index("collaboration_posts_type_idx").on(table.postType),
  }),
);

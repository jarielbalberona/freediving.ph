import { relations } from "drizzle-orm";
import { integer, pgEnum, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

import { timestamps } from "@/databases/drizzle/helpers";
import { users } from "./authentication.model";

export const PROFILE_ITEM_VISIBILITY = pgEnum("profile_item_visibility", ["PUBLIC", "MEMBERS_ONLY", "PRIVATE"]);
export const PB_DISCIPLINE = pgEnum("pb_discipline", ["STA", "DYN", "DYNB", "DNF", "CWT", "CWTB", "FIM", "CNF", "VWT", "OTHER"]);

export const personalBests = pgTable("personal_bests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  discipline: PB_DISCIPLINE("discipline").notNull(),
  resultValue: varchar("result_value", { length: 50 }).notNull(),
  resultUnit: varchar("result_unit", { length: 20 }).notNull(),
  recordedAt: timestamp("recorded_at", { withTimezone: true }),
  visibility: PROFILE_ITEM_VISIBILITY("visibility").default("PUBLIC").notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  ...timestamps,
});

export const profileActivityItems = pgTable("profile_activity_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 80 }).notNull(),
  targetType: varchar("target_type", { length: 80 }).notNull(),
  targetId: varchar("target_id", { length: 120 }).notNull(),
  visibility: PROFILE_ITEM_VISIBILITY("visibility").default("PUBLIC").notNull(),
  text: text("text"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  ...timestamps,
});

export const personalBestsRelations = relations(personalBests, ({ one }) => ({
  user: one(users, {
    fields: [personalBests.userId],
    references: [users.id],
  }),
}));

export const profileActivityItemsRelations = relations(profileActivityItems, ({ one }) => ({
  user: one(users, {
    fields: [profileActivityItems.userId],
    references: [users.id],
  }),
}));

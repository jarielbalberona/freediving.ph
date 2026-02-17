import { relations } from "drizzle-orm";
import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

import { timestamps } from "../../databases/drizzle/helpers";
import { users } from "./authentication.model";

// Tag Suggestions Table (User tag suggestions)
export const tagSuggestions = pgTable("tag_suggestions", {
  id: serial("id").primaryKey(),
  suggestedBy: integer("suggested_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 50 }).notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  emoji: varchar("emoji", { length: 10 }).notNull(),
  reason: text("reason"), // Why this tag should be added
  status: text("status").default("PENDING"), // PENDING, APPROVED, REJECTED
  reviewedBy: integer("reviewed_by").references(() => users.id), // Admin who reviewed
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  ...timestamps
});

// Relationships
export const tagSuggestionsRelations = relations(tagSuggestions, ({ one }) => ({
  suggestedByUser: one(users, {
    fields: [tagSuggestions.suggestedBy],
    references: [users.id]
  }),
  reviewedByUser: one(users, {
    fields: [tagSuggestions.reviewedBy],
    references: [users.id]
  })
}));

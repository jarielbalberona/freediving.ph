import { relations } from "drizzle-orm";
import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

import { timestamps } from "@/databases/drizzle/helpers";
import { users } from "./authentication.model";

// Service Suggestions Table (User service suggestions)
export const serviceSuggestions = pgTable("service_suggestions", {
  id: serial("id").primaryKey(),
  suggestedBy: integer("suggested_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 50 }).notNull(),
  description: text("description"),
  emoji: varchar("emoji", { length: 10 }).notNull(),
  reason: text("reason"), // Why this service should be added
  status: text("status").default("PENDING"), // PENDING, APPROVED, REJECTED
  reviewedBy: integer("reviewed_by").references(() => users.id), // Admin who reviewed
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  ...timestamps
});

// Relationships
export const serviceSuggestionsRelations = relations(serviceSuggestions, ({ one }) => ({
  suggestedByUser: one(users, {
    fields: [serviceSuggestions.suggestedBy],
    references: [users.id]
  }),
  reviewedByUser: one(users, {
    fields: [serviceSuggestions.reviewedBy],
    references: [users.id]
  })
}));

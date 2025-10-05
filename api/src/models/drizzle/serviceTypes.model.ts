import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  varchar,
} from "drizzle-orm/pg-core";

import { timestamps } from "@/databases/drizzle/helpers";
import { users } from "./authentication.model";

// Service Types Table (Dynamic with approval workflow)
export const serviceTypes = pgTable("service_types", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).unique().notNull(), // 'Buddy', 'Photographer', 'Videographer'
  description: text("description"),
  emoji: varchar("emoji", { length: 10 }).notNull(),
  isApproved: boolean("is_approved").default(false), // Admin approval
  suggestedBy: integer("suggested_by").references(() => users.id), // Who suggested it
  approvedBy: integer("approved_by").references(() => users.id), // Admin who approved
  usageCount: integer("usage_count").default(0), // How many users offer this service
  ...timestamps
});

// Relationships
export const serviceTypesRelations = relations(serviceTypes, ({ one, many }) => ({
  suggestedByUser: one(users, {
    fields: [serviceTypes.suggestedBy],
    references: [users.id]
  }),
  approvedByUser: one(users, {
    fields: [serviceTypes.approvedBy],
    references: [users.id]
  })
}));

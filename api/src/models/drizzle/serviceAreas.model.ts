import { relations } from "drizzle-orm";
import { pgTable, serial, text, varchar, integer, decimal, boolean } from "drizzle-orm/pg-core";
import { users } from "./authentication.model";
import { timestamps } from "@/databases/drizzle/helpers";

// Service Areas Table - defines geographic areas where services are offered
export const serviceAreas = pgTable("service_areas", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(), // e.g., "Metro Manila", "Cebu City"
  description: text("description"),

  // Geographic boundaries
  centerLat: decimal("center_lat", { precision: 10, scale: 8 }),
  centerLng: decimal("center_lng", { precision: 11, scale: 8 }),
  radius: integer("radius"), // km radius from center

  // Service area settings
  isPrimary: boolean("is_primary").default(false), // Primary service area
  travelFee: decimal("travel_fee", { precision: 10, scale: 2 }), // Additional fee for this area
  currency: varchar("currency", { length: 3 }).default("PHP"),

  // Availability
  isActive: boolean("is_active").default(true),

  ...timestamps
});

// Relations
export const serviceAreasRelations = relations(serviceAreas, ({ one }) => ({
  user: one(users, {
    fields: [serviceAreas.userId],
    references: [users.id]
  })
}));

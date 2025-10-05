import { relations } from "drizzle-orm";
import {
  boolean,
  decimal,
  integer,
  pgTable,
  serial,
  text,
} from "drizzle-orm/pg-core";

import { timestamps } from "@/databases/drizzle/helpers";
import { userServices } from "./userServices.model";

// Service Areas Table (Multiple locations per service)
export const serviceAreas = pgTable("service_areas", {
  id: serial("id").primaryKey(),
  serviceId: integer("service_id")
    .notNull()
    .references(() => userServices.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // "Anilao, Batangas"
  lat: decimal("lat", { precision: 10, scale: 8 }),
  lng: decimal("lng", { precision: 11, scale: 8 }),
  isPrimary: boolean("is_primary").default(false), // Primary service location
  travelFee: decimal("travel_fee", { precision: 10, scale: 2 }).default("0"), // Additional fee for this location
  notes: text("notes"), // Special notes for this location
  ...timestamps
});

// Relationships
export const serviceAreasRelations = relations(serviceAreas, ({ one }) => ({
  service: one(userServices, {
    fields: [serviceAreas.serviceId],
    references: [userServices.id]
  })
}));

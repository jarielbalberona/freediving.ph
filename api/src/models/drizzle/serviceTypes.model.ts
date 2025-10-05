import { relations } from "drizzle-orm";
import { pgTable, serial, text, varchar, boolean } from "drizzle-orm/pg-core";
import { timestamps } from "@/databases/drizzle/helpers";
import { userServices } from "./userServices.model";

// Service Types Table - defines what types of services can be offered
export const serviceTypes = pgTable("service_types", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(), // e.g., "Underwater Photography", "Dive Guide"
  description: text("description"),
  category: varchar("category", { length: 50 }), // e.g., "Photography", "Instruction", "Equipment"
  icon: varchar("icon", { length: 50 }), // Icon name for UI
  isActive: boolean("is_active").default(true),
  ...timestamps
});

// Relations
export const serviceTypesRelations = relations(serviceTypes, ({ many }) => ({
  userServices: many(userServices)
}));

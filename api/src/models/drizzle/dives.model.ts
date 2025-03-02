import { integer, pgTable, serial, text, timestamp, decimal, doublePrecision } from "drizzle-orm/pg-core";
import { timestamps } from "@/databases/drizzle/helpers";
import { users } from "./authentication.model"
import { diveSpots } from "./diveSpots.model"
import { DIVE_TYPE } from "@/databases/drizzle/lists";

export const diveLogs = pgTable("dive_logs", {
  id: serial("id").primaryKey(),
  diveSpotId: integer("dive_spot_id")
    .notNull()
    .references((): any => diveSpots.id, { onDelete: "cascade" }), // Links to dive spot
  userId: integer("user_id")
    .notNull()
    .references((): any => users.id, { onDelete: "cascade" }), // Links to uploader
  imageUrl: text("image_url"), // Optional: Dive photo
  caption: text("caption"), // Optional: Caption for the dive/photo
  maxDepth: integer("max_depth"), // Optional: Maximum depth reached (meters)
  diveTime: integer("dive_time"), // Optional: Total dive time (seconds)
  diveDate: timestamp("dive_date"), // Optional: When the dive happened
  diveType: text("dive_type", { enum: DIVE_TYPE.enumValues }).default(DIVE_TYPE.FUN),
  waterConditions: text("water_conditions"), // Visibility, currents, thermocline, etc.
  waterTemperature: decimal("water_temperature", { precision: 4, scale: 1 }), // Temperature in °C (e.g., 28.5°C)
  equipmentUsed: text("equipment_used"), // List of gear used (e.g., fins, mask, weights)
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  locationName: text("location_name"),
  ...timestamps
});

export const diveLogBuddies = pgTable("dive_log_buddies", {
  id: serial("id").primaryKey(),
  diveLogId: integer("dive_log_id")
    .notNull()
    .references((): any => diveLogs.id, { onDelete: "cascade" }), // Links to dive log
  buddyId: integer("buddy_id")
    .notNull()
    .references((): any => users.id, { onDelete: "cascade" }), // Links to another user
});

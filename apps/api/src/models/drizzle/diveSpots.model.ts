import { integer, pgTable, serial, text, doublePrecision } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { DIVE_DIFFICULTY } from "@/databases/drizzle/lists";
import { timestamps } from "@/databases/drizzle/helpers";
import { users } from "./authentication.model"

export const diveSpots = pgTable("dive_spots", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  locationName: text("location_name"),
  depth: integer("depth"), // Depth in meters
  difficulty: text("difficulty", { enum: DIVE_DIFFICULTY.enumValues }).default(DIVE_DIFFICULTY.BEGINNER),
  description: text("description"),
  bestSeason: text("best_season"),
  imageUrl: text("image_url"), // Optional: Dive photo
  directions: text("directions"),
  ...timestamps
});

export const diveSpotComments = pgTable("dive_spot_comments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references((): any => users.id, { onDelete: "cascade" }), // Explicit type
  diveSpotId: integer("dive_spot_id")
    .notNull()
    .references((): any => diveSpots.id, { onDelete: "cascade" }), // Explicit type
  parentId: integer("parent_id")
    .references((): any => diveSpotComments.id, { onDelete: "cascade" }), // Explicit type for self-referencing
  content: text("content").notNull(),
  imageUrl: text("image_url"), // Optional: Dive photo
  ...timestamps
});

export const diveSpotRatings = pgTable("dive_spot_ratings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  diveSpotId: integer("dive_spot_id").notNull().references(() => diveSpots.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(),
  imageUrl: text("image_url"), // Optional: Dive photo
  review: text("review"), // Optional review text
  ...timestamps
});









// Add a SQL constraint separately
export const diveSpotRatingsConstraints = sql`
  ALTER TABLE dive_spot_ratings
  ADD CONSTRAINT check_rating_range CHECK (rating BETWEEN 1 AND 5);
`;

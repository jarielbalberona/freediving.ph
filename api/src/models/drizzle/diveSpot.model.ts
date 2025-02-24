import { integer, pgTable, serial, text } from "drizzle-orm/pg-core";
import { DIVE_DIFFICULTY } from "@/databases/drizzle/lists";
import { timestamps } from "@/databases/drizzle/helpers";

export const diveSpot = pgTable("dive_spot", {
	id: serial("id").primaryKey(),
	name: text("name").notNull(),
	location: text("location").notNull(), // Store as "latitude,longitude" or use PostGIS
	depth: integer("depth"), // Depth in meters
	difficulty: text("difficulty", { enum: DIVE_DIFFICULTY.enumValues }).default(DIVE_DIFFICULTY.BEGINNER),
	description: text("description"),
	bestSeason: text("best_season"),
	...timestamps
});

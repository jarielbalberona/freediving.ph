import { sql } from "drizzle-orm";
import { jsonb, pgTable, serial, text } from "drizzle-orm/pg-core";

import { timestamps } from "@/databases/drizzle/helpers";

export const diveShop = pgTable("dive_shop", {
	id: serial("id").primaryKey(),
	name: text("name").notNull(),
	location: text("location").notNull(), // Store as "latitude,longitude" or use PostGIS
	contactInfo: jsonb("contact_info"), // Store phone, email, social media as JSON
	services: text("services")
		.array()
		.notNull()
		.default(sql`ARRAY[]::text[]`), // Example: ['Gear Rental', 'Courses']
	website: text("website"),
	...timestamps
});

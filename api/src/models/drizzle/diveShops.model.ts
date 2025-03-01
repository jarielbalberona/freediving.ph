import { sql } from "drizzle-orm";
import { jsonb, pgTable, serial, text, decimal} from "drizzle-orm/pg-core";

import { timestamps } from "@/databases/drizzle/helpers";

export const diveShops = pgTable("dive_shops", {
	id: serial("id").primaryKey(),
	name: text("name").notNull(),
  latitude: text("latitude"),
  longitude: text("longitude"),
  locationName: text("location_name"),
	contactInfo: jsonb("contact_info"), // Store phone, email, social media as JSON
	services: text("services")
		.array()
		.notNull()
		.default(sql`ARRAY[]::text[]`), // Example: ['Gear Rental', 'Courses']
	website: text("website"),
	...timestamps
});

import { sql } from "drizzle-orm";
import { integer, numeric, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

import { diveShops } from "./diveShops.model";
import { diveSpots } from "./diveSpots.model";
import { timestamps } from "@/databases/drizzle/helpers";

export const diveTours = pgTable("dive_tours", {
	id: serial("id").primaryKey(),
	shopId: integer("shop_id").references(() => diveShops.id, { onDelete: "cascade" }),
	locationId: integer("location_id").references(() => diveSpots.id, { onDelete: "set null" }),
	tourName: text("tour_name").notNull(),
	price: numeric("price", { precision: 10, scale: 2 }),
	description: text("description"),
	availableDates: timestamp("available_dates", { withTimezone: true })
		.array()
		.notNull()
		.default(sql`ARRAY[]::timestamp[]`),
	...timestamps
});

import { sql } from "drizzle-orm";
import { integer, numeric, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

import { diveShop } from "./diveShop.model";
import { diveSpot } from "./diveSpot.model";
import { timestamps } from "@/databases/drizzle/helpers";

export const diveTour = pgTable("dive_tour", {
	id: serial("id").primaryKey(),
	shopId: integer("shop_id").references(() => diveShop.id, { onDelete: "cascade" }),
	locationId: integer("location_id").references(() => diveSpot.id, { onDelete: "set null" }),
	tourName: text("tour_name").notNull(),
	price: numeric("price", { precision: 10, scale: 2 }),
	description: text("description"),
	availableDates: timestamp("available_dates", { withTimezone: true })
		.array()
		.notNull()
		.default(sql`ARRAY[]::timestamp[]`),
	...timestamps
});

import { integer, pgEnum, pgTable, serial, text } from "drizzle-orm/pg-core";

import { diveShops } from "./diveShops.model";
import { diveSpots } from "./diveSpots.model";
import { timestamps } from "@/databases/drizzle/helpers";

export const ratingEnum = pgEnum("rating_enum", ["1", "2", "3", "4", "5"]);

export const reviews = pgTable("reviews", {
	id: serial("id").primaryKey(),
	userId: text("user_id").notNull(), // Assuming UUID or text for user identification
	spotId: integer("spot_id").references(() => diveSpots.id, { onDelete: "cascade" }),
	shopId: integer("shop_id").references(() => diveShops.id, { onDelete: "cascade" }),
	rating: ratingEnum("rating").notNull(), // Uses ENUM instead
	comment: text("comment"),
	...timestamps
});

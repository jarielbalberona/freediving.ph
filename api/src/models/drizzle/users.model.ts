import {
  integer,
  pgTable,
  serial,
  text,
  boolean,
  json,
} from "drizzle-orm/pg-core";
import { users } from "./authentication.model";
import { timestamps } from "@/databases/drizzle/helpers";

export const userSettings = pgTable("user_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  isPrivate: boolean("isPrivate").default(false),
  theme: text("theme").default("light"),
  notifications: boolean("notifications").default(true),
  language: text("language").default("en"),
  privacy: json("privacy"),
  ...timestamps,
});

export const userSocials = pgTable("user_socials", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  email: text("email"),
  phone: text("phone"),
  website: text("website"),

  twitter: text("twitter"),
  facebook: text("facebook"),
  instagram: text("instagram"),
  linkedin: text("linkedin"),
  github: text("github"),
  tiktok: text("tiktok"),
  ...timestamps,
});

import { relations } from "drizzle-orm";
import { pgTable, serial, varchar, boolean, integer, primaryKey, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./authentication.model"
import { timestamps } from "@/databases/drizzle/helpers";


// Tags Table (Dynamic with approval workflow)
export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).unique().notNull(),
  category: varchar("category", { length: 50 }).notNull(), // 'skill', 'location', 'interest', 'certification'
  emoji: varchar("emoji", { length: 10 }).notNull(),
  isApproved: boolean("is_approved").default(false), // Admin approval
  suggestedBy: integer("suggested_by").references(() => users.id), // Who suggested it
  approvedBy: integer("approved_by").references(() => users.id), // Admin who approved
  usageCount: integer("usage_count").default(0), // How many users use this tag
  ...timestamps
});

// User Tags Table (Many-to-Many)
export const userTags = pgTable(
  "user_tags",
  {
    userId: integer("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    tagId: integer("tag_id")
      .references(() => tags.id, { onDelete: "cascade" })
      .notNull(),
    isTopTag: boolean("is_top_tag").default(false),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.tagId] }),
    userTagIndex: index("user_tag_index").on(table.userId, table.tagId),
  })
);

// Create a Unique Index for `isTopTag = true`
export const addTopTagConstraint = sql`
  CREATE UNIQUE INDEX unique_top_tag ON user_tags(user_id) WHERE is_top_tag = true;
`;

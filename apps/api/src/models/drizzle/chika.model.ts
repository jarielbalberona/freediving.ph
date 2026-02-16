import { relations } from "drizzle-orm";
import { integer, pgEnum, pgTable, serial, uniqueIndex, varchar } from "drizzle-orm/pg-core";

import { timestamps } from "@/databases/drizzle/helpers";
import { users } from "./authentication.model";
import { threads } from "./threads.model";

export const CHIKA_CATEGORY_MODE = pgEnum("chika_category_mode", ["NORMAL", "PSEUDONYMOUS_CHIKA"]);

export const threadCategoryModes = pgTable("thread_category_modes", {
  id: serial("id").primaryKey(),
  threadId: integer("thread_id")
    .notNull()
    .references(() => threads.id, { onDelete: "cascade" }),
  mode: CHIKA_CATEGORY_MODE("mode").default("NORMAL").notNull(),
  ...timestamps,
});

export const chikaPseudonyms = pgTable(
  "chika_pseudonyms",
  {
    id: serial("id").primaryKey(),
    threadId: integer("thread_id")
      .notNull()
      .references(() => threads.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    displayHandle: varchar("display_handle", { length: 40 }).notNull(),
    ...timestamps,
  },
  (table) => ({
    threadUserUniqueIdx: uniqueIndex("chika_pseudonyms_thread_user_unique_idx").on(table.threadId, table.userId),
    threadHandleUniqueIdx: uniqueIndex("chika_pseudonyms_thread_handle_unique_idx").on(table.threadId, table.displayHandle),
  }),
);

export const chikaPseudonymsRelations = relations(chikaPseudonyms, ({ one }) => ({
  thread: one(threads, {
    fields: [chikaPseudonyms.threadId],
    references: [threads.id],
  }),
  user: one(users, {
    fields: [chikaPseudonyms.userId],
    references: [users.id],
  }),
}));

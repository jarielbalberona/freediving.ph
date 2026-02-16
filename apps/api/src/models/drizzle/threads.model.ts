import { relations, sql } from "drizzle-orm";
import { check } from "drizzle-orm/pg-core";
import {
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex
} from "drizzle-orm/pg-core";


import { timestamps } from "@/databases/drizzle/helpers";
import { users, sessions, accounts } from "./authentication.model"

import { REACTION_LIST } from "@/databases/drizzle/lists";

export const REACTION_TYPE = pgEnum("reaction_type", ["1", "0"]);// Convert numbers to strings

// Threads Table
export const threads = pgTable("threads", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  ...timestamps
});

// Comments Table
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  threadId: integer("thread_id").notNull().references(() => threads.id, { onDelete: "cascade" }),
  parentId: integer("parent_id").references((): any => comments.id, { onDelete: "cascade" }), // Explicit type annotation
  content: text("content").notNull(),
  ...timestamps
});

export const reactions = pgTable("reactions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    threadId: integer("thread_id").references(() => threads.id, { onDelete: "cascade" }),
    commentId: integer("comment_id").references(() => comments.id, { onDelete: "cascade" }),
    type: REACTION_TYPE("type").notNull(), // 1 = Like, 0 = Dislike
    ...timestamps,
  },
  (table) => ({
    checkThreadOrComment: check(
      "check_thread_or_comment", // ✅ Constraint name
      sql`${table.threadId} IS NOT NULL OR ${table.commentId} IS NOT NULL` // ✅ SQL condition
    ),
  })
);

// Relationships
export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  threads: many(threads),
  comments: many(comments),
  reactions: many(reactions)
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id]
  })
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id]
  })
}));

export const threadsRelations = relations(threads, ({ one, many }) => ({
  user: one(users, {
    fields: [threads.userId],
    references: [users.id]
  }),
  comments: many(comments),
  reactions: many(reactions)
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
  user: one(users, {
    fields: [comments.userId],
    references: [users.id]
  }),
  thread: one(threads, {
    fields: [comments.threadId],
    references: [threads.id]
  }),
  parentComment: one(comments, {
    fields: [comments.parentId],
    references: [comments.id]
  }),
  childComments: many(comments),
  reactions: many(reactions)
}));

export const reactionsRelations = relations(reactions, ({ one }) => ({
  user: one(users, {
    fields: [reactions.userId],
    references: [users.id]
  }),
  thread: one(threads, {
    fields: [reactions.threadId],
    references: [threads.id]
  }),
  comment: one(comments, {
    fields: [reactions.commentId],
    references: [comments.id]
  })
}));

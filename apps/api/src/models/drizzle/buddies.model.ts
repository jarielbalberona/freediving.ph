import { relations } from "drizzle-orm";
import { integer, pgEnum, pgTable, serial, text, uniqueIndex } from "drizzle-orm/pg-core";

import { timestamps } from "@/databases/drizzle/helpers";
import { users } from "./authentication.model";

export const BUDDY_REQUEST_STATE = pgEnum("buddy_request_state", [
  "PENDING",
  "ACCEPTED",
  "REJECTED",
  "CANCELED",
  "EXPIRED",
]);

export const BUDDY_RELATIONSHIP_STATE = pgEnum("buddy_relationship_state", ["ACTIVE", "BLOCKED"]);

export const buddyRequests = pgTable(
  "buddy_requests",
  {
    id: serial("id").primaryKey(),
    fromUserId: integer("from_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    toUserId: integer("to_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    state: BUDDY_REQUEST_STATE("state").default("PENDING").notNull(),
    rejectionReason: text("rejection_reason"),
    ...timestamps,
  },
  (table) => ({
    fromToUniqueIdx: uniqueIndex("buddy_requests_from_to_unique_idx").on(table.fromUserId, table.toUserId),
  }),
);

export const buddyRelationships = pgTable(
  "buddy_relationships",
  {
    id: serial("id").primaryKey(),
    userIdA: integer("user_id_a")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    userIdB: integer("user_id_b")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    state: BUDDY_RELATIONSHIP_STATE("state").default("ACTIVE").notNull(),
    ...timestamps,
  },
  (table) => ({
    userPairUniqueIdx: uniqueIndex("buddy_relationships_user_pair_unique_idx").on(table.userIdA, table.userIdB),
  }),
);

export const buddyRequestsRelations = relations(buddyRequests, ({ one }) => ({
  fromUser: one(users, {
    fields: [buddyRequests.fromUserId],
    references: [users.id],
  }),
  toUser: one(users, {
    fields: [buddyRequests.toUserId],
    references: [users.id],
  }),
}));

export const buddyRelationshipsRelations = relations(buddyRelationships, ({ one }) => ({
  userA: one(users, {
    fields: [buddyRelationships.userIdA],
    references: [users.id],
  }),
  userB: one(users, {
    fields: [buddyRelationships.userIdB],
    references: [users.id],
  }),
}));

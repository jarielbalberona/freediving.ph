import { relations } from "drizzle-orm";
import {
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { timestamps } from "@/databases/drizzle/helpers";
import { users } from "./authentication.model";

export const BLOCK_SCOPE = pgEnum("block_scope", ["PLATFORM", "MESSAGING_ONLY"]);
export const REPORT_TARGET_TYPE = pgEnum("report_target_type", [
  "USER",
  "PROFILE",
  "PERSONAL_BEST",
  "PROFILE_ACTIVITY_ITEM",
  "THREAD",
  "POST",
  "CONVERSATION",
  "MESSAGE",
  "GROUP",
  "EVENT",
  "DIVE_SITE",
  "COMPETITIVE_RECORD",
  "TRAINING_LOG",
  "SAFETY_RESOURCE",
  "AWARENESS_POST",
  "MARKETPLACE_LISTING",
  "COLLABORATION_POST",
  "OTHER",
]);
export const REPORT_REASON_CODE = pgEnum("report_reason_code", [
  "SPAM",
  "HARASSMENT",
  "DOXXING",
  "IMPERSONATION",
  "HATE",
  "MISINFORMATION",
  "SCAM",
  "SAFETY",
  "OTHER",
]);
export const REPORT_STATUS = pgEnum("report_status", ["OPEN", "UNDER_REVIEW", "RESOLVED", "DISMISSED"]);
export const MODERATION_THREAD_STATE = pgEnum("moderation_thread_state", ["OPEN", "LOCKED", "REMOVED"]);
export const FEATURE_RESTRICTION_TYPE = pgEnum("feature_restriction_type", ["DM_DISABLED", "CHIKA_POSTING_DISABLED"]);

export const blocks = pgTable(
  "blocks",
  {
    id: serial("id").primaryKey(),
    blockerUserId: integer("blocker_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    blockedUserId: integer("blocked_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    scope: BLOCK_SCOPE("scope").default("PLATFORM").notNull(),
    ...timestamps,
  },
  (table) => ({
    blockerBlockedIdx: uniqueIndex("blocks_blocker_blocked_idx").on(table.blockerUserId, table.blockedUserId),
  }),
);

export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  reporterUserId: integer("reporter_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  targetType: REPORT_TARGET_TYPE("target_type").notNull(),
  targetId: text("target_id").notNull(),
  reasonCode: REPORT_REASON_CODE("reason_code").notNull(),
  text: text("text"),
  status: REPORT_STATUS("status").default("OPEN").notNull(),
  reviewedByUserId: integer("reviewed_by_user_id").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  resolutionNote: text("resolution_note"),
  ...timestamps,
});

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  actorUserId: integer("actor_user_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const threadModerationStates = pgTable(
  "thread_moderation_states",
  {
    id: serial("id").primaryKey(),
    threadId: integer("thread_id").notNull(),
    state: MODERATION_THREAD_STATE("state").default("OPEN").notNull(),
    reasonCode: REPORT_REASON_CODE("reason_code"),
    note: text("note"),
    actedByUserId: integer("acted_by_user_id").references(() => users.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (table) => ({
    threadIdUniqueIdx: uniqueIndex("thread_moderation_states_thread_id_unique_idx").on(table.threadId),
  }),
);

export const userFeatureRestrictions = pgTable(
  "user_feature_restrictions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    restrictionType: FEATURE_RESTRICTION_TYPE("restriction_type").notNull(),
    isActive: integer("is_active").default(1).notNull(),
    reasonCode: REPORT_REASON_CODE("reason_code"),
    note: text("note"),
    actedByUserId: integer("acted_by_user_id").references(() => users.id, { onDelete: "set null" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => ({
    userRestrictionUniqueIdx: uniqueIndex("user_feature_restrictions_user_type_unique_idx").on(
      table.userId,
      table.restrictionType
    ),
  }),
);

export const blocksRelations = relations(blocks, ({ one }) => ({
  blocker: one(users, {
    fields: [blocks.blockerUserId],
    references: [users.id],
  }),
  blocked: one(users, {
    fields: [blocks.blockedUserId],
    references: [users.id],
  }),
}));

export const reportsRelations = relations(reports, ({ one }) => ({
  reporter: one(users, {
    fields: [reports.reporterUserId],
    references: [users.id],
  }),
  reviewer: one(users, {
    fields: [reports.reviewedByUserId],
    references: [users.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  actor: one(users, {
    fields: [auditLogs.actorUserId],
    references: [users.id],
  }),
}));

export const threadModerationStatesRelations = relations(threadModerationStates, ({ one }) => ({
  actor: one(users, {
    fields: [threadModerationStates.actedByUserId],
    references: [users.id],
  }),
}));

export const userFeatureRestrictionsRelations = relations(userFeatureRestrictions, ({ one }) => ({
  user: one(users, {
    fields: [userFeatureRestrictions.userId],
    references: [users.id],
  }),
  actor: one(users, {
    fields: [userFeatureRestrictions.actedByUserId],
    references: [users.id],
  }),
}));

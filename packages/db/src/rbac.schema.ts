import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";

export const GLOBAL_ROLE_ENUM = pgEnum("global_role", [
  "member",
  "trusted_member",
  "support",
  "moderator",
  "explore_curator",
  "records_verifier",
  "admin",
  "super_admin"
]);

export const GROUP_ROLE_ENUM = pgEnum("group_role", ["group_admin", "group_moderator", "group_member"]);
export const EVENT_ROLE_ENUM = pgEnum("event_role", ["event_host", "event_cohost", "event_attendee"]);
export const ACCOUNT_STATUS_ENUM = pgEnum("app_account_status", ["active", "read_only", "suspended"]);
export const REPORT_STATUS_ENUM = pgEnum("app_report_status", ["open", "reviewing", "resolved", "rejected"]);
export const MOD_ACTION_ENUM = pgEnum("mod_action_type", [
  "warn",
  "mute",
  "read_only",
  "suspend",
  "unsuspend",
  "ban"
]);

export const appUsers = pgTable(
  "app_users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clerkUserId: text("clerk_user_id").notNull().unique(),
    email: text("email").unique(),
    displayName: text("display_name"),
    globalRole: GLOBAL_ROLE_ENUM("global_role").default("member").notNull(),
    trustScore: integer("trust_score").default(0).notNull(),
    status: ACCOUNT_STATUS_ENUM("status").default("active").notNull(),
    suspensionUntil: timestamp("suspension_until", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    roleStatusIdx: index("app_users_role_status_idx").on(table.globalRole, table.status)
  })
);

export const userPermissionOverrides = pgTable("user_permission_overrides", {
  userId: uuid("user_id")
    .notNull()
    .primaryKey()
    .references(() => appUsers.id, { onDelete: "cascade" }),
  overrides: jsonb("overrides").notNull().default({}),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const groupMemberships = pgTable(
  "group_memberships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    groupId: integer("group_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => appUsers.id, { onDelete: "cascade" }),
    role: GROUP_ROLE_ENUM("role").default("group_member").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    groupUserUnique: uniqueIndex("group_memberships_group_user_uidx").on(table.groupId, table.userId)
  })
);

export const eventMemberships = pgTable(
  "event_memberships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: integer("event_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => appUsers.id, { onDelete: "cascade" }),
    role: EVENT_ROLE_ENUM("role").default("event_attendee").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    eventUserUnique: uniqueIndex("event_memberships_event_user_uidx").on(table.eventId, table.userId)
  })
);

export const appBlocks = pgTable(
  "app_blocks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    blockerUserId: uuid("blocker_user_id")
      .notNull()
      .references(() => appUsers.id, { onDelete: "cascade" }),
    blockedUserId: uuid("blocked_user_id")
      .notNull()
      .references(() => appUsers.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    blockerBlockedUnique: uniqueIndex("app_blocks_blocker_blocked_uidx").on(table.blockerUserId, table.blockedUserId)
  })
);

export const appReports = pgTable("app_reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  reporterUserId: uuid("reporter_user_id")
    .notNull()
    .references(() => appUsers.id, { onDelete: "cascade" }),
  targetType: text("target_type").notNull(),
  targetId: text("target_id").notNull(),
  reasonCode: text("reason_code").notNull(),
  details: text("details"),
  status: REPORT_STATUS_ENUM("status").default("open").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true })
});

export const moderationActions = pgTable("moderation_actions", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorUserId: uuid("actor_user_id").references(() => appUsers.id, { onDelete: "set null" }),
  targetUserId: uuid("target_user_id").references(() => appUsers.id, { onDelete: "set null" }),
  actionType: MOD_ACTION_ENUM("action_type").notNull(),
  reason: text("reason").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorUserId: uuid("actor_user_id").references(() => appUsers.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    actionEntityIdx: index("audit_log_action_entity_idx").on(table.action, table.entityType)
  })
);

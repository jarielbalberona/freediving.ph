import { relations } from "drizzle-orm";
import { pgTable, serial, text, timestamp, varchar, integer, jsonb, boolean, pgEnum } from "drizzle-orm/pg-core";
import { users } from "./authentication.model";
import { timestamps } from "../../databases/drizzle/helpers";

// Notification Types Enum
export const NOTIFICATION_TYPE = pgEnum("notification_type", [
  "SYSTEM",
  "MESSAGE",
  "EVENT",
  "GROUP",
  "SERVICE",
  "BOOKING",
  "REVIEW",
  "MENTION",
  "LIKE",
  "COMMENT",
  "FRIEND_REQUEST",
  "GROUP_INVITE",
  "EVENT_REMINDER",
  "PAYMENT",
  "SECURITY"
]);

// Notification Priority Enum
export const NOTIFICATION_PRIORITY = pgEnum("notification_priority", [
  "LOW",
  "NORMAL",
  "HIGH",
  "URGENT"
]);

// Notification Status Enum
export const NOTIFICATION_STATUS = pgEnum("notification_status", [
  "UNREAD",
  "READ",
  "ARCHIVED",
  "DELETED"
]);

// Notifications Table
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: NOTIFICATION_TYPE("type").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  priority: NOTIFICATION_PRIORITY("priority").default("NORMAL"),
  status: NOTIFICATION_STATUS("status").default("UNREAD"),

  // Related entities
  relatedUserId: integer("related_user_id")
    .references(() => users.id, { onDelete: "set null" }),
  relatedEntityType: varchar("related_entity_type", { length: 50 }),
  relatedEntityId: integer("related_entity_id"),

  // Media and actions
  imageUrl: text("image_url"),
  actionUrl: text("action_url"),
  metadata: jsonb("metadata"),

  // Timestamps
  readAt: timestamp("read_at", { withTimezone: true }),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  ...timestamps
});

// Notification Settings Table
export const notificationSettings = pgTable("notification_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: NOTIFICATION_TYPE("type").notNull(),
  enabled: boolean("enabled").default(true),
  emailEnabled: boolean("email_enabled").default(true),
  pushEnabled: boolean("push_enabled").default(true),
  smsEnabled: boolean("sms_enabled").default(false),
  ...timestamps
});

// Notification Templates Table
export const notificationTemplates = pgTable("notification_templates", {
  id: serial("id").primaryKey(),
  type: NOTIFICATION_TYPE("type").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  variables: jsonb("variables"),
  isActive: boolean("is_active").default(true),
  ...timestamps
});

// Relations
export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id]
  }),
  relatedUser: one(users, {
    fields: [notifications.relatedUserId],
    references: [users.id]
  })
}));

export const notificationSettingsRelations = relations(notificationSettings, ({ one }) => ({
  user: one(users, {
    fields: [notificationSettings.userId],
    references: [users.id]
  })
}));

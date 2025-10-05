import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
  jsonb,
} from "drizzle-orm/pg-core";

import { timestamps } from "@/databases/drizzle/helpers";
import { users } from "./authentication.model";

// Notification Types
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

// Notification Status
export const NOTIFICATION_STATUS = pgEnum("notification_status", [
  "UNREAD",
  "READ",
  "ARCHIVED",
  "DELETED"
]);

// Notification Priority
export const NOTIFICATION_PRIORITY = pgEnum("notification_priority", [
  "LOW",
  "NORMAL",
  "HIGH",
  "URGENT"
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
  status: NOTIFICATION_STATUS("status").default("UNREAD").notNull(),
  priority: NOTIFICATION_PRIORITY("priority").default("NORMAL").notNull(),

  // Optional references to related entities
  relatedUserId: integer("related_user_id").references(() => users.id), // User who triggered the notification
  relatedEntityType: varchar("related_entity_type", { length: 50 }), // 'event', 'group', 'message', 'service', etc.
  relatedEntityId: integer("related_entity_id"), // ID of the related entity

  // Rich content
  imageUrl: text("image_url"),
  actionUrl: text("action_url"), // URL to navigate when notification is clicked
  metadata: jsonb("metadata"), // Additional data (JSON)

  // Delivery settings
  isEmailSent: boolean("is_email_sent").default(false),
  isPushSent: boolean("is_push_sent").default(false),
  emailSentAt: timestamp("email_sent_at", { withTimezone: true }),
  pushSentAt: timestamp("push_sent_at", { withTimezone: true }),

  // Read tracking
  readAt: timestamp("read_at", { withTimezone: true }),
  archivedAt: timestamp("archived_at", { withTimezone: true }),

  ...timestamps
});

// Notification Settings Table - User preferences for notifications
export const notificationSettings = pgTable("notification_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  // Global settings
  emailEnabled: boolean("email_enabled").default(true),
  pushEnabled: boolean("push_enabled").default(true),
  inAppEnabled: boolean("in_app_enabled").default(true),

  // Notification type preferences
  systemNotifications: boolean("system_notifications").default(true),
  messageNotifications: boolean("message_notifications").default(true),
  eventNotifications: boolean("event_notifications").default(true),
  groupNotifications: boolean("group_notifications").default(true),
  serviceNotifications: boolean("service_notifications").default(true),
  bookingNotifications: boolean("booking_notifications").default(true),
  reviewNotifications: boolean("review_notifications").default(true),
  mentionNotifications: boolean("mention_notifications").default(true),
  likeNotifications: boolean("like_notifications").default(true),
  commentNotifications: boolean("comment_notifications").default(true),
  friendRequestNotifications: boolean("friend_request_notifications").default(true),
  groupInviteNotifications: boolean("group_invite_notifications").default(true),
  eventReminderNotifications: boolean("event_reminder_notifications").default(true),
  paymentNotifications: boolean("payment_notifications").default(true),
  securityNotifications: boolean("security_notifications").default(true),

  // Frequency settings
  digestFrequency: varchar("digest_frequency", { length: 20 }).default("DAILY"), // IMMEDIATE, DAILY, WEEKLY, NEVER
  quietHoursStart: varchar("quiet_hours_start", { length: 5 }), // "22:00"
  quietHoursEnd: varchar("quiet_hours_end", { length: 5 }), // "08:00"
  timezone: varchar("timezone", { length: 50 }).default("Asia/Manila"),

  ...timestamps
});

// Notification Templates Table - For system-generated notifications
export const notificationTemplates = pgTable("notification_templates", {
  id: serial("id").primaryKey(),
  type: NOTIFICATION_TYPE("type").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  message: text("message").notNull(),
  isActive: boolean("is_active").default(true),
  variables: jsonb("variables"), // Available template variables
  ...timestamps
});

// Notification Delivery Log - Track delivery attempts
export const notificationDeliveryLog = pgTable("notification_delivery_log", {
  id: serial("id").primaryKey(),
  notificationId: integer("notification_id")
    .notNull()
    .references(() => notifications.id, { onDelete: "cascade" }),
  deliveryMethod: varchar("delivery_method", { length: 20 }).notNull(), // 'email', 'push', 'in_app'
  status: varchar("status", { length: 20 }).notNull(), // 'sent', 'failed', 'bounced', 'delivered'
  errorMessage: text("error_message"),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  ...timestamps
});

// Relationships
export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  relatedUser: one(users, {
    fields: [notifications.relatedUserId],
    references: [users.id],
  }),
  deliveryLogs: one(notificationDeliveryLog, {
    fields: [notifications.id],
    references: [notificationDeliveryLog.notificationId],
  }),
}));

export const notificationSettingsRelations = relations(notificationSettings, ({ one }) => ({
  user: one(users, {
    fields: [notificationSettings.userId],
    references: [users.id],
  }),
}));

export const notificationTemplatesRelations = relations(notificationTemplates, ({ many }) => ({
  // No direct relationships, templates are used by the system
}));

export const notificationDeliveryLogRelations = relations(notificationDeliveryLog, ({ one }) => ({
  notification: one(notifications, {
    fields: [notificationDeliveryLog.notificationId],
    references: [notifications.id],
  }),
}));

// Add notification relations to users table
export const usersNotificationRelations = relations(users, ({ many }) => ({
  notifications: many(notifications),
  notificationSettings: many(notificationSettings),
}));

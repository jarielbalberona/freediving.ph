import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
  jsonb,
  primaryKey,
} from "drizzle-orm/pg-core";

import { timestamps } from "@/databases/drizzle/helpers";
import { users } from "./authentication.model";

// Message Types
export const MESSAGE_TYPE = pgEnum("message_type", [
  "TEXT",
  "IMAGE",
  "VIDEO",
  "AUDIO",
  "FILE",
  "LOCATION",
  "SYSTEM"
]);

// Conversation Types
export const CONVERSATION_TYPE = pgEnum("conversation_type", [
  "DIRECT",
  "GROUP",
  "CHANNEL"
]);

// Message Status
export const MESSAGE_STATUS = pgEnum("message_status", [
  "SENT",
  "DELIVERED",
  "READ",
  "FAILED"
]);

// Conversations Table
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }), // For group conversations
  description: text("description"), // For group conversations
  type: CONVERSATION_TYPE("type").default("DIRECT").notNull(),
  isActive: boolean("is_active").default(true),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
  lastMessageId: integer("last_message_id"), // References messages.id
  createdBy: integer("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  ...timestamps
});

// Conversation Participants (Many-to-Many with additional fields)
export const conversationParticipants = pgTable(
  "conversation_participants",
  {
    conversationId: integer("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 20 }).default("MEMBER"), // OWNER, ADMIN, MODERATOR, MEMBER
    joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow(),
    leftAt: timestamp("left_at", { withTimezone: true }),
    isActive: boolean("is_active").default(true),
    lastReadAt: timestamp("last_read_at", { withTimezone: true }),
    lastReadMessageId: integer("last_read_message_id"), // References messages.id
    notificationSettings: jsonb("notification_settings"), // User's notification preferences for this conversation
    ...timestamps
  },
  (table) => ({
    pk: primaryKey({ columns: [table.conversationId, table.userId] }),
  })
);

// Messages Table
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  senderId: integer("sender_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: MESSAGE_TYPE("type").default("TEXT").notNull(),
  content: text("content").notNull(),
  status: MESSAGE_STATUS("status").default("SENT").notNull(),

  // Message threading/replies
  parentMessageId: integer("parent_message_id"), // For replies - will be set up in relations
  threadId: integer("thread_id"), // For message threads - will be set up in relations

  // Rich content
  metadata: jsonb("metadata"), // Additional message data (JSON)
  editedAt: timestamp("edited_at", { withTimezone: true }),
  editedBy: integer("edited_by").references(() => users.id),

  // Delivery tracking
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  readAt: timestamp("read_at", { withTimezone: true }),

  // Message reactions
  reactionsCount: integer("reactions_count").default(0),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),

  ...timestamps
}, (table) => ({
  conversationCreatedAtIdx: index("messages_conversation_created_at_idx").on(table.conversationId, table.createdAt),
}));

// Message Attachments Table
export const messageAttachments = pgTable("message_attachments", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id")
    .notNull()
    .references(() => messages.id, { onDelete: "cascade" }),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  originalName: varchar("original_name", { length: 255 }).notNull(),
  fileType: varchar("file_type", { length: 50 }).notNull(),
  fileSize: integer("file_size").notNull(), // in bytes
  fileUrl: text("file_url").notNull(),
  thumbnailUrl: text("thumbnail_url"), // For images/videos
  mimeType: varchar("mime_type", { length: 100 }),
  width: integer("width"), // For images/videos
  height: integer("height"), // For images/videos
  duration: integer("duration"), // For audio/video in seconds
  ...timestamps
});

// Message Reactions Table
export const messageReactions = pgTable(
  "message_reactions",
  {
    messageId: integer("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    emoji: varchar("emoji", { length: 10 }).notNull(), // Unicode emoji
    ...timestamps
  },
  (table) => ({
    pk: primaryKey({ columns: [table.messageId, table.userId, table.emoji] }),
  })
);

// Message Mentions Table
export const messageMentions = pgTable(
  "message_mentions",
  {
    messageId: integer("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    mentionedUserId: integer("mentioned_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ...timestamps
  },
  (table) => ({
    pk: primaryKey({ columns: [table.messageId, table.mentionedUserId] }),
  })
);

// Message Read Receipts Table
export const messageReadReceipts = pgTable(
  "message_read_receipts",
  {
    messageId: integer("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    readAt: timestamp("read_at", { withTimezone: true }).defaultNow(),
    ...timestamps
  },
  (table) => ({
    pk: primaryKey({ columns: [table.messageId, table.userId] }),
  })
);

// Relationships
export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  creator: one(users, {
    fields: [conversations.createdBy],
    references: [users.id],
  }),
  participants: many(conversationParticipants),
  messages: many(messages),
}));

export const conversationParticipantsRelations = relations(conversationParticipants, ({ one }) => ({
  conversation: one(conversations, {
    fields: [conversationParticipants.conversationId],
    references: [conversations.id],
  }),
  user: one(users, {
    fields: [conversationParticipants.userId],
    references: [users.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one, many }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
  parentMessage: one(messages, {
    fields: [messages.parentMessageId],
    references: [messages.id],
  }),
  threadMessages: many(messages),
  attachments: many(messageAttachments),
  reactions: many(messageReactions),
  mentions: many(messageMentions),
  readReceipts: many(messageReadReceipts),
}));

export const messageAttachmentsRelations = relations(messageAttachments, ({ one }) => ({
  message: one(messages, {
    fields: [messageAttachments.messageId],
    references: [messages.id],
  }),
}));

export const messageReactionsRelations = relations(messageReactions, ({ one }) => ({
  message: one(messages, {
    fields: [messageReactions.messageId],
    references: [messages.id],
  }),
  user: one(users, {
    fields: [messageReactions.userId],
    references: [users.id],
  }),
}));

export const messageMentionsRelations = relations(messageMentions, ({ one }) => ({
  message: one(messages, {
    fields: [messageMentions.messageId],
    references: [messages.id],
  }),
  mentionedUser: one(users, {
    fields: [messageMentions.mentionedUserId],
    references: [users.id],
  }),
}));

export const messageReadReceiptsRelations = relations(messageReadReceipts, ({ one }) => ({
  message: one(messages, {
    fields: [messageReadReceipts.messageId],
    references: [messages.id],
  }),
  user: one(users, {
    fields: [messageReadReceipts.userId],
    references: [users.id],
  }),
}));

// Add message relations to users table
export const usersMessageRelations = relations(users, ({ many }) => ({
  conversations: many(conversationParticipants),
  sentMessages: many(messages),
  messageReactions: many(messageReactions),
  messageMentions: many(messageMentions),
  messageReadReceipts: many(messageReadReceipts),
}));

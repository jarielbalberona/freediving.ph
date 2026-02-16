import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  varchar,
} from "drizzle-orm/pg-core";

import { timestamps } from "@/databases/drizzle/helpers";
import { users } from "./authentication.model";

// Group types enum
export const GROUP_TYPE = pgEnum("group_type", [
  "PUBLIC",
  "PRIVATE",
  "INVITE_ONLY",
  "CLOSED"
]);

// Group status enum
export const GROUP_STATUS = pgEnum("group_status", [
  "ACTIVE",
  "INACTIVE",
  "SUSPENDED",
  "ARCHIVED"
]);

// Groups Table
export const groups = pgTable("groups", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).unique().notNull(), // URL-friendly identifier
  description: text("description"),
  shortDescription: varchar("short_description", { length: 255 }), // Brief description for cards

  // Group settings
  type: GROUP_TYPE("type").default("PUBLIC"),
  status: GROUP_STATUS("status").default("ACTIVE"),
  isPublic: boolean("is_public").default(true),
  allowMemberInvites: boolean("allow_member_invites").default(true),

  // Group info
  coverImage: text("cover_image"), // Group cover photo
  avatar: text("avatar"), // Group avatar/logo
  website: text("website"),
  location: text("location"), // Primary group location
  lat: text("lat"), // Latitude for location-based groups
  lng: text("lng"), // Longitude for location-based groups

  // Group statistics
  memberCount: integer("member_count").default(0),
  eventCount: integer("event_count").default(0),
  postCount: integer("post_count").default(0),

  // Group settings
  maxMembers: integer("max_members"), // Optional member limit
  joinApprovalRequired: boolean("join_approval_required").default(false),
  allowMemberPosts: boolean("allow_member_posts").default(true),
  allowMemberEvents: boolean("allow_member_events").default(true),

  // Group rules and guidelines
  rules: text("rules"), // Group rules/guidelines
  tags: text("tags").array(), // Group tags for categorization

  // Ownership and management
  createdBy: integer("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  // Timestamps
  ...timestamps
});

// Group Members Table (Many-to-Many with roles)
export const groupMembers = pgTable("group_members", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id")
    .notNull()
    .references(() => groups.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  // Member role and status
  role: text("role").default("member"), // 'owner', 'admin', 'moderator', 'member'
  status: text("status").default("active"), // 'active', 'pending', 'banned', 'left'

  // Member permissions
  canPost: boolean("can_post").default(true),
  canCreateEvents: boolean("can_create_events").default(true),
  canInviteMembers: boolean("can_invite_members").default(false),
  canModerate: boolean("can_moderate").default(false),

  // Member info
  joinedAt: text("joined_at"), // When they joined
  invitedBy: integer("invited_by").references(() => users.id), // Who invited them
  leftAt: text("left_at"), // When they left (if applicable)

  // Member settings
  notificationSettings: text("notification_settings"), // JSON for notification preferences

  ...timestamps
});

// Group Posts Table (Posts within groups)
export const groupPosts = pgTable("group_posts", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id")
    .notNull()
    .references(() => groups.id, { onDelete: "cascade" }),
  authorId: integer("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  // Post content
  title: varchar("title", { length: 200 }),
  content: text("content").notNull(),
  postType: text("post_type").default("text"), // 'text', 'image', 'video', 'link', 'event'

  // Post settings
  isPinned: boolean("is_pinned").default(false),
  isAnnouncement: boolean("is_announcement").default(false),
  allowComments: boolean("allow_comments").default(true),

  // Post engagement
  likeCount: integer("like_count").default(0),
  commentCount: integer("comment_count").default(0),
  shareCount: integer("share_count").default(0),

  // Post media
  mediaUrls: text("media_urls").array(), // Array of media URLs
  linkPreview: text("link_preview"), // JSON for link previews

  // Post visibility
  visibility: text("visibility").default("public"), // 'public', 'members_only', 'admins_only'

  ...timestamps
});

// Group Post Comments Table
export const groupPostComments = pgTable("group_post_comments", {
  id: serial("id").primaryKey(),
  postId: integer("post_id")
    .notNull()
    .references(() => groupPosts.id, { onDelete: "cascade" }),
  authorId: integer("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  parentId: integer("parent_id"), // For nested comments - will be set up in relations

  content: text("content").notNull(),
  likeCount: integer("like_count").default(0),

  ...timestamps
});

// Group Post Likes Table
export const groupPostLikes = pgTable("group_post_likes", {
  id: serial("id").primaryKey(),
  postId: integer("post_id")
    .notNull()
    .references(() => groupPosts.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  ...timestamps
});

// Relationships
export const groupsRelations = relations(groups, ({ one, many }) => ({
  creator: one(users, {
    fields: [groups.createdBy],
    references: [users.id]
  }),
  members: many(groupMembers),
  posts: many(groupPosts)
}));

export const groupMembersRelations = relations(groupMembers, ({ one }) => ({
  group: one(groups, {
    fields: [groupMembers.groupId],
    references: [groups.id]
  }),
  user: one(users, {
    fields: [groupMembers.userId],
    references: [users.id]
  }),
  invitedByUser: one(users, {
    fields: [groupMembers.invitedBy],
    references: [users.id]
  })
}));

export const groupPostsRelations = relations(groupPosts, ({ one, many }) => ({
  group: one(groups, {
    fields: [groupPosts.groupId],
    references: [groups.id]
  }),
  author: one(users, {
    fields: [groupPosts.authorId],
    references: [users.id]
  }),
  comments: many(groupPostComments),
  likes: many(groupPostLikes)
}));

export const groupPostCommentsRelations = relations(groupPostComments, ({ one, many }) => ({
  post: one(groupPosts, {
    fields: [groupPostComments.postId],
    references: [groupPosts.id]
  }),
  author: one(users, {
    fields: [groupPostComments.authorId],
    references: [users.id]
  }),
  parent: one(groupPostComments, {
    fields: [groupPostComments.parentId],
    references: [groupPostComments.id]
  }),
  replies: many(groupPostComments)
}));

export const groupPostLikesRelations = relations(groupPostLikes, ({ one }) => ({
  post: one(groupPosts, {
    fields: [groupPostLikes.postId],
    references: [groupPosts.id]
  }),
  user: one(users, {
    fields: [groupPostLikes.userId],
    references: [users.id]
  })
}));

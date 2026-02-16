import { relations } from "drizzle-orm";
import {
  boolean,
  decimal,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

import { timestamps } from "@/databases/drizzle/helpers";
import { users } from "./authentication.model";
import { groups } from "./groups.model";

// Event types enum
export const EVENT_TYPE = pgEnum("event_type", [
  "DIVE_SESSION",
  "TRAINING",
  "COMPETITION",
  "SOCIAL",
  "WORKSHOP",
  "MEETUP",
  "TOURNAMENT",
  "FUNDRAISER"
]);

// Event status enum
export const EVENT_STATUS = pgEnum("event_status", [
  "DRAFT",
  "PUBLISHED",
  "CANCELLED",
  "COMPLETED",
  "POSTPONED",
  "REMOVED"
]);

// Event visibility enum
export const EVENT_VISIBILITY = pgEnum("event_visibility", [
  "PUBLIC",
  "PRIVATE",
  "GROUP_ONLY",
  "INVITE_ONLY"
]);

// Events Table
export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 200 }).unique().notNull(), // URL-friendly identifier
  description: text("description"),
  shortDescription: varchar("short_description", { length: 500 }), // Brief description for cards

  // Event details
  type: EVENT_TYPE("type").default("DIVE_SESSION"),
  status: EVENT_STATUS("status").default("DRAFT"),
  visibility: EVENT_VISIBILITY("visibility").default("PUBLIC"),

  // Event timing
  startDate: timestamp("start_date", { withTimezone: true }).notNull(),
  endDate: timestamp("end_date", { withTimezone: true }),
  registrationDeadline: timestamp("registration_deadline", { withTimezone: true }),
  timezone: varchar("timezone", { length: 50 }).default("Asia/Manila"),

  // Event location
  location: text("location").notNull(),
  address: text("address"),
  lat: decimal("lat", { precision: 10, scale: 8 }),
  lng: decimal("lng", { precision: 11, scale: 8 }),
  venueName: varchar("venue_name", { length: 100 }),

  // Event capacity and pricing
  maxAttendees: integer("max_attendees"),
  currentAttendees: integer("current_attendees").default(0),
  waitlistEnabled: boolean("waitlist_enabled").default(false),
  waitlistCount: integer("waitlist_count").default(0),

  // Pricing
  isFree: boolean("is_free").default(true),
  price: decimal("price", { precision: 10, scale: 2 }),
  currency: varchar("currency", { length: 3 }).default("PHP"),
  earlyBirdPrice: decimal("early_bird_price", { precision: 10, scale: 2 }),
  earlyBirdDeadline: timestamp("early_bird_deadline", { withTimezone: true }),

  // Event requirements
  skillLevel: text("skill_level"), // 'BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL'
  equipmentRequired: text("equipment_required"), // What equipment participants need
  certificationRequired: text("certification_required"), // Required certifications
  ageRestriction: text("age_restriction"), // Age requirements

  // Event media
  coverImage: text("cover_image"), // Event cover photo
  images: text("images").array(), // Array of event images
  videoUrl: text("video_url"), // Event video

  // Event settings
  allowWaitlist: boolean("allow_waitlist").default(true),
  requireApproval: boolean("require_approval").default(false),
  allowCancellation: boolean("allow_cancellation").default(true),
  cancellationDeadline: timestamp("cancellation_deadline", { withTimezone: true }),

  // Event engagement
  likeCount: integer("like_count").default(0),
  shareCount: integer("share_count").default(0),
  commentCount: integer("comment_count").default(0),

  // Event tags and categories
  tags: text("tags").array(), // Event tags for categorization
  category: text("category"), // Event category

  // Event contact and info
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  website: text("website"),
  socialLinks: text("social_links"), // JSON for social media links

  // Event organizer (can be user or group)
  organizerType: text("organizer_type").notNull(), // 'user' or 'group'
  organizerId: integer("organizer_id").notNull(), // References users.id or groups.id based on organizerType

  // Group association (if event is created by a group)
  groupId: integer("group_id").references(() => groups.id, { onDelete: "set null" }),

  // Event settings
  settings: text("settings"), // JSON for additional event settings

  ...timestamps
});

// Event Attendees Table
export const eventAttendees = pgTable("event_attendees", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  // Attendance status
  status: text("status").default("registered"), // 'registered', 'attended', 'cancelled', 'no_show'
  registrationDate: timestamp("registration_date", { withTimezone: true }).defaultNow(),

  // Payment info
  amountPaid: decimal("amount_paid", { precision: 10, scale: 2 }),
  paymentStatus: text("payment_status").default("pending"), // 'pending', 'paid', 'refunded'
  paymentMethod: text("payment_method"),

  // Attendee info
  emergencyContact: text("emergency_contact"), // Emergency contact info
  dietaryRestrictions: text("dietary_restrictions"),
  medicalConditions: text("medical_conditions"),
  notes: text("notes"), // Additional notes from attendee

  // Check-in info
  checkedIn: boolean("checked_in").default(false),
  checkedInAt: timestamp("checked_in_at", { withTimezone: true }),
  checkedInBy: integer("checked_in_by").references(() => users.id),

  ...timestamps
});

// Event Waitlist Table
export const eventWaitlist = pgTable("event_waitlist", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  position: integer("position").notNull(), // Position in waitlist
  joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow(),
  notified: boolean("notified").default(false), // If they were notified of availability

  ...timestamps
});

// Event Comments Table
export const eventComments = pgTable("event_comments", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  parentId: integer("parent_id"), // For nested comments - will be set up in relations

  content: text("content").notNull(),
  isPrivate: boolean("is_private").default(false), // Private comments (organizer only)

  ...timestamps
});

// Event Likes Table
export const eventLikes = pgTable("event_likes", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  ...timestamps
});

// Relationships
export const eventsRelations = relations(events, ({ one, many }) => ({
  // Note: organizer relationship is handled dynamically based on organizerType
  // organizer: one(users, { fields: [events.organizerId], references: [users.id] }) // For user organizers
  // organizerGroup: one(groups, { fields: [events.organizerId], references: [groups.id] }) // For group organizers

  group: one(groups, {
    fields: [events.groupId],
    references: [groups.id]
  }),
  attendees: many(eventAttendees),
  waitlist: many(eventWaitlist),
  comments: many(eventComments),
  likes: many(eventLikes)
}));

export const eventAttendeesRelations = relations(eventAttendees, ({ one }) => ({
  event: one(events, {
    fields: [eventAttendees.eventId],
    references: [events.id]
  }),
  user: one(users, {
    fields: [eventAttendees.userId],
    references: [users.id]
  }),
  checkedInByUser: one(users, {
    fields: [eventAttendees.checkedInBy],
    references: [users.id]
  })
}));

export const eventWaitlistRelations = relations(eventWaitlist, ({ one }) => ({
  event: one(events, {
    fields: [eventWaitlist.eventId],
    references: [events.id]
  }),
  user: one(users, {
    fields: [eventWaitlist.userId],
    references: [users.id]
  })
}));

export const eventCommentsRelations = relations(eventComments, ({ one, many }) => ({
  event: one(events, {
    fields: [eventComments.eventId],
    references: [events.id]
  }),
  user: one(users, {
    fields: [eventComments.userId],
    references: [users.id]
  }),
  parent: one(eventComments, {
    fields: [eventComments.parentId],
    references: [eventComments.id]
  }),
  replies: many(eventComments)
}));

export const eventLikesRelations = relations(eventLikes, ({ one }) => ({
  event: one(events, {
    fields: [eventLikes.eventId],
    references: [events.id]
  }),
  user: one(users, {
    fields: [eventLikes.userId],
    references: [users.id]
  })
}));

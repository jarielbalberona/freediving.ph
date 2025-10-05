import { relations } from "drizzle-orm";
import {
  boolean,
  decimal,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { timestamps } from "@/databases/drizzle/helpers";
import { users } from "./authentication.model";
import { serviceTypes } from "./serviceTypes.model";
import { serviceAreas } from "./serviceAreas.model";

// Service types enum
export const SERVICE_TYPE = pgEnum("service_type", [
  "BUDDY",
  "PHOTOGRAPHER",
  "VIDEOGRAPHER",
  "INSTRUCTOR",
  "GUIDE",
  "EQUIPMENT_RENTAL",
  "TRANSPORTATION"
]);

// Experience levels
export const EXPERIENCE_LEVEL = pgEnum("experience_level", [
  "BEGINNER",
  "INTERMEDIATE",
  "ADVANCED",
  "PROFESSIONAL"
]);

// User services table - stores what services a user offers
export const userServices = pgTable("user_services", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  serviceTypeId: integer("service_type_id")
    .notNull()
    .references(() => serviceTypes.id, { onDelete: "cascade" }), // Dynamic service type
  isAvailable: boolean("is_available").default(true),

  // Service details
  title: text("title").notNull(), // e.g., "Professional Underwater Photographer"
  description: text("description"),
  rate: decimal("rate", { precision: 10, scale: 2 }), // Hourly or per session rate
  currency: text("currency").default("PHP"),
  rateType: text("rate_type"), // 'per_hour', 'per_day', 'per_session'

  // Experience and skills - STRUCTURED DATA
  experienceLevel: EXPERIENCE_LEVEL("experience_level").default("INTERMEDIATE"),
  yearsExperience: integer("years_experience"),

  // Service-specific skills (structured, not generic tags)
  skills: text("skills").array(), // e.g., ["Reef Photography", "Macro Photography", "Deep Diving"]
  certifications: text("certifications").array(), // e.g., ["PADI Advanced", "UW Photography"]
  specialties: text("specialties").array(), // e.g., ["Wedding Photography", "Marine Biology"]

  // Service Area Settings
  maxTravelDistance: integer("max_travel_distance"), // km radius from primary location
  defaultTravelFee: decimal("default_travel_fee", { precision: 10, scale: 2 }), // Default travel fee for non-primary areas

  // Service Specifics
  maxDepth: integer("max_depth"), // Maximum depth they can work at
  equipmentProvided: boolean("equipment_provided").default(false),
  equipmentDetails: text("equipment_details"), // What equipment is provided

  // Contact and portfolio
  portfolioUrl: text("portfolio_url"),
  contactInfo: jsonb("contact_info"), // Phone, email, social media

  // Availability
  availableDays: text("available_days").array(), // ["Monday", "Tuesday", "Weekends"]
  availableTimes: text("available_times"), // "9AM-5PM"

  // Service-specific settings
  settings: jsonb("settings"), // Flexible JSON for service-specific configs

  ...timestamps
});

// Service reviews/ratings table
export const serviceReviews = pgTable("service_reviews", {
  id: serial("id").primaryKey(),
  serviceId: integer("service_id")
    .notNull()
    .references(() => userServices.id, { onDelete: "cascade" }),
  bookingId: integer("booking_id")
    .references(() => serviceBookings.id, { onDelete: "cascade" }),
  reviewerId: integer("reviewer_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }), // Who wrote the review
  revieweeId: integer("reviewee_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }), // Who is being reviewed
  rating: integer("rating").notNull(), // 1-5 stars
  review: text("review"),

  // Review categories
  communicationRating: integer("communication_rating"), // 1-5
  punctualityRating: integer("punctuality_rating"), // 1-5
  skillRating: integer("skill_rating"), // 1-5

  ...timestamps
});

// Service bookings/appointments
export const serviceBookings = pgTable("service_bookings", {
  id: serial("id").primaryKey(),
  serviceId: integer("service_id")
    .notNull()
    .references(() => userServices.id, { onDelete: "cascade" }),
  clientId: integer("client_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  providerId: integer("provider_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }), // Who is providing service
  bookingDate: timestamp("booking_date", { withTimezone: true }).notNull(),
  duration: integer("duration"), // in minutes
  location: text("location"),
  notes: text("notes"),

  // Pricing
  rate: decimal("rate", { precision: 10, scale: 2 }),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }),
  currency: text("currency").default("PHP"),

  // Status
  status: text("status").default("PENDING"), // PENDING, CONFIRMED, COMPLETED, CANCELLED
  paymentStatus: text("payment_status").default("PENDING"), // PENDING, PAID, REFUNDED

  ...timestamps
});

// Relationships
export const userServicesRelations = relations(userServices, ({ one, many }) => ({
  user: one(users, {
    fields: [userServices.userId],
    references: [users.id]
  }),
  serviceType: one(serviceTypes, {
    fields: [userServices.serviceTypeId],
    references: [serviceTypes.id]
  }),
  serviceAreas: many(serviceAreas),
  reviews: many(serviceReviews),
  bookings: many(serviceBookings)
}));

export const serviceReviewsRelations = relations(serviceReviews, ({ one }) => ({
  service: one(userServices, {
    fields: [serviceReviews.serviceId],
    references: [userServices.id]
  }),
  reviewer: one(users, {
    fields: [serviceReviews.reviewerId],
    references: [users.id]
  })
}));

export const serviceBookingsRelations = relations(serviceBookings, ({ one }) => ({
  service: one(userServices, {
    fields: [serviceBookings.serviceId],
    references: [userServices.id]
  }),
  client: one(users, {
    fields: [serviceBookings.clientId],
    references: [users.id]
  }),
  provider: one(users, {
    fields: [serviceBookings.providerId],
    references: [users.id]
  })
}));

// Add relations to users table
export const usersServiceRelations = relations(users, ({ many }) => ({
  services: many(userServices),
  serviceReviews: many(serviceReviews),
  serviceBookings: many(serviceBookings)
}));

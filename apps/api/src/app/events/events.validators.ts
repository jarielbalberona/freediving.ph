import { z } from "zod";
import { PaginationQuerySchema } from "@/validators/pagination.schema";

export const EventsServerSchema = z.object({
	title: z.string().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
	slug: z.string().min(1, "Slug is required").max(200, "Slug must be less than 200 characters"),
	description: z.string().min(1, "Description is required").max(2000, "Description must be less than 2000 characters").optional(),
	location: z.string().min(1, "Location is required").max(200, "Location must be less than 200 characters"),
	startDate: z.coerce.date({
		required_error: "Start date is required",
		invalid_type_error: "Start date must be a valid date"
	}),
	endDate: z.coerce.date({
		required_error: "End date is required",
		invalid_type_error: "End date must be a valid date"
	}).optional(),
	organizerId: z.number().int().positive("Organizer ID must be a positive integer"),
	organizerType: z.enum(["USER", "GROUP"], {
		required_error: "Organizer type is required",
		invalid_type_error: "Organizer type must be either USER or GROUP"
	}),
	diveSpotId: z.number().int().positive("Dive spot ID must be a positive integer").optional(),
	maxAttendees: z.number().int().positive("Max attendees must be a positive integer").optional(),
	registrationDeadline: z.coerce.date({
		required_error: "Registration deadline is required",
		invalid_type_error: "Registration deadline must be a valid date"
	}).optional(),
	type: z.enum(["DIVE_SESSION", "TRAINING", "COMPETITION", "SOCIAL", "WORKSHOP", "MEETUP", "TOURNAMENT", "FUNDRAISER"], {
		required_error: "Type is required",
		invalid_type_error: "Type must be a supported event type"
	}),
	status: z.enum(["DRAFT", "PUBLISHED", "CANCELLED", "COMPLETED", "REMOVED"], {
		required_error: "Status is required",
		invalid_type_error: "Status must be one of: DRAFT, PUBLISHED, CANCELLED, COMPLETED, REMOVED"
	}).default("DRAFT"),
	imageUrl: z.string().url("Image URL must be a valid URL").optional(),
	requirements: z.string().max(1000, "Requirements must be less than 1000 characters").optional(),
	equipment: z.string().max(1000, "Equipment must be less than 1000 characters").optional(),
	price: z.number().min(0, "Price must be non-negative").optional(),
	earlyBirdPrice: z.number().min(0, "Early bird price must be non-negative").optional(),
	currency: z.string().length(3, "Currency must be a 3-letter code").optional(),
});

export const EventsUpdateSchema = z.object({
	title: z.string().min(1, "Title is required").max(200, "Title must be less than 200 characters").optional(),
	description: z.string().min(1, "Description is required").max(2000, "Description must be less than 2000 characters").optional(),
	location: z.string().min(1, "Location is required").max(200, "Location must be less than 200 characters").optional(),
	startDate: z.coerce.date({
		invalid_type_error: "Start date must be a valid date"
	}).optional(),
	endDate: z.coerce.date({
		invalid_type_error: "End date must be a valid date"
	}).optional(),
	maxAttendees: z.number().int().positive("Max attendees must be a positive integer").optional(),
	registrationDeadline: z.coerce.date({
		invalid_type_error: "Registration deadline must be a valid date"
	}).optional(),
	type: z.enum(["DIVE_SESSION", "TRAINING", "COMPETITION", "SOCIAL", "WORKSHOP", "MEETUP", "TOURNAMENT", "FUNDRAISER"], {
		invalid_type_error: "Type must be a supported event type"
	}).optional(),
	status: z.enum(["DRAFT", "PUBLISHED", "CANCELLED", "COMPLETED", "REMOVED"], {
		invalid_type_error: "Status must be one of: DRAFT, PUBLISHED, CANCELLED, COMPLETED, REMOVED"
	}).optional(),
	imageUrl: z.string().url("Image URL must be a valid URL").optional(),
	requirements: z.string().max(1000, "Requirements must be less than 1000 characters").optional(),
	equipment: z.string().max(1000, "Equipment must be less than 1000 characters").optional(),
	price: z.number().min(0, "Price must be non-negative").optional(),
	earlyBirdPrice: z.number().min(0, "Early bird price must be non-negative").optional(),
	currency: z.string().length(3, "Currency must be a 3-letter code").optional(),
	diveSpotId: z.number().int().positive("Dive spot ID must be a positive integer").optional(),
});

export const EventAttendeeSchema = z.object({
	status: z.enum(["registered", "attended", "cancelled", "no_show"], {
		required_error: "Status is required",
		invalid_type_error: "Status must be one of: registered, attended, cancelled, no_show"
	}).default("registered"),
	emergencyContact: z.string().max(200, "Emergency contact must be less than 200 characters").optional(),
	notes: z.string().max(500, "Notes must be less than 500 characters").optional(),
});

export const EventQuerySchema = z.object({
	page: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().int().min(1)).default("1"),
	limit: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().int().min(1).max(100)).default("10"),
	type: z.enum(["DIVE_SESSION", "TRAINING", "COMPETITION", "SOCIAL", "WORKSHOP", "MEETUP", "TOURNAMENT", "FUNDRAISER"]).optional(),
	status: z.enum(["DRAFT", "PUBLISHED", "CANCELLED", "COMPLETED", "REMOVED"]).optional(),
	organizerId: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().int().positive()).optional(),
	location: z.string().optional(),
	startDate: z.string().transform((val) => new Date(val)).pipe(z.date()).optional(),
	endDate: z.string().transform((val) => new Date(val)).pipe(z.date()).optional(),
});

export const EventsListQuerySchema = PaginationQuerySchema.extend({
	diveSpotId: z.coerce.number().int().positive().optional(),
	location: z.string().trim().max(120).optional(),
	search: z.string().trim().max(120).optional(),
	status: z.enum(["DRAFT", "PUBLISHED", "CANCELLED", "COMPLETED", "POSTPONED", "REMOVED"]).optional()
});

export type EventsServerSchemaType = z.infer<typeof EventsServerSchema>;
export type EventsUpdateSchemaType = z.infer<typeof EventsUpdateSchema>;
export type EventAttendeeSchemaType = z.infer<typeof EventAttendeeSchema>;
export type EventQuerySchemaType = z.infer<typeof EventQuerySchema>;
export type EventsListQuerySchemaType = z.infer<typeof EventsListQuerySchema>;

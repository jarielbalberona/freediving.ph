import { z } from "zod";
import { zodMessages } from "@/core/messages";

export const UserServicesServerSchema = z.object({
	userId: z.number().int().positive("User ID must be a positive integer"),
	serviceTypeId: z.number().int().positive("Service type ID must be a positive integer"),
	title: z.string().min(1, "Title is required").max(255, "Title must be less than 255 characters"),
	description: z.string().max(2000, "Description must be less than 2000 characters").optional(),
	rate: z.number().min(0, "Rate must be non-negative").optional(),
	currency: z.string().length(3, "Currency must be a 3-letter code").optional(),
	rateType: z.enum(["per_hour", "per_day", "per_session"], {
		invalid_type_error: "Rate type must be one of: per_hour, per_day, per_session"
	}).optional(),
	experienceLevel: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "PROFESSIONAL"], {
		invalid_type_error: "Experience level must be one of: BEGINNER, INTERMEDIATE, ADVANCED, PROFESSIONAL"
	}).optional(),
	yearsExperience: z.number().int().min(0, "Years of experience must be non-negative").optional(),
	skills: z.array(z.string().max(100, "Skill must be less than 100 characters")).max(20, "Maximum 20 skills allowed").optional(),
	certifications: z.array(z.string().max(200, "Certification must be less than 200 characters")).max(10, "Maximum 10 certifications allowed").optional(),
	specialties: z.array(z.string().max(100, "Specialty must be less than 100 characters")).max(10, "Maximum 10 specialties allowed").optional(),
	maxTravelDistance: z.number().int().min(0, "Max travel distance must be non-negative").optional(),
	defaultTravelFee: z.number().min(0, "Default travel fee must be non-negative").optional(),
	maxDepth: z.number().int().min(0, "Max depth must be non-negative").optional(),
	equipmentProvided: z.boolean().optional(),
	equipmentDetails: z.string().max(500, "Equipment details must be less than 500 characters").optional(),
	portfolioUrl: z.string().url("Portfolio URL must be a valid URL").optional(),
	contactInfo: z.record(z.any()).optional(),
	availableDays: z.array(z.string().max(20, "Day must be less than 20 characters")).max(7, "Maximum 7 days allowed").optional(),
	availableTimes: z.string().max(200, "Available times must be less than 200 characters").optional(),
	settings: z.record(z.any()).optional(),
	isAvailable: z.boolean().default(true),
});

export const UserServicesUpdateSchema = z.object({
	title: z.string().min(1, "Title is required").max(255, "Title must be less than 255 characters").optional(),
	description: z.string().max(2000, "Description must be less than 2000 characters").optional(),
	isAvailable: z.boolean().optional(),
	rate: z.number().min(0, "Rate must be non-negative").optional(),
	currency: z.string().length(3, "Currency must be a 3-letter code").optional(),
	rateType: z.enum(["per_hour", "per_day", "per_session"], {
		invalid_type_error: "Rate type must be one of: per_hour, per_day, per_session"
	}).optional(),
	experienceLevel: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "PROFESSIONAL"], {
		invalid_type_error: "Experience level must be one of: BEGINNER, INTERMEDIATE, ADVANCED, PROFESSIONAL"
	}).optional(),
	yearsExperience: z.number().int().min(0, "Years of experience must be non-negative").optional(),
	skills: z.array(z.string().max(100, "Skill must be less than 100 characters")).max(20, "Maximum 20 skills allowed").optional(),
	certifications: z.array(z.string().max(200, "Certification must be less than 200 characters")).max(10, "Maximum 10 certifications allowed").optional(),
	specialties: z.array(z.string().max(100, "Specialty must be less than 100 characters")).max(10, "Maximum 10 specialties allowed").optional(),
	maxTravelDistance: z.number().int().min(0, "Max travel distance must be non-negative").optional(),
	defaultTravelFee: z.number().min(0, "Default travel fee must be non-negative").optional(),
	maxDepth: z.number().int().min(0, "Max depth must be non-negative").optional(),
	equipmentProvided: z.boolean().optional(),
	equipmentDetails: z.string().max(500, "Equipment details must be less than 500 characters").optional(),
	portfolioUrl: z.string().url("Portfolio URL must be a valid URL").optional(),
	contactInfo: z.record(z.any()).optional(),
	availableDays: z.array(z.string().max(20, "Day must be less than 20 characters")).max(7, "Maximum 7 days allowed").optional(),
	availableTimes: z.string().max(200, "Available times must be less than 200 characters").optional(),
	settings: z.record(z.any()).optional(),
});

export const ServiceBookingSchema = z.object({
	serviceId: z.number().int().positive("Service ID must be a positive integer"),
	clientId: z.number().int().positive("Client ID must be a positive integer"),
	providerId: z.number().int().positive("Provider ID must be a positive integer"),
	bookingDate: z.date({
		required_error: "Booking date is required",
		invalid_type_error: "Booking date must be a valid date"
	}),
	startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Start time must be in HH:MM format"),
	endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "End time must be in HH:MM format"),
	duration: z.number().int().positive("Duration must be a positive integer").optional(),
	location: z.string().max(255, "Location must be less than 255 characters").optional(),
	lat: z.number().min(-90).max(90, "Latitude must be between -90 and 90").optional(),
	lng: z.number().min(-180).max(180, "Longitude must be between -180 and 180").optional(),
	notes: z.string().max(1000, "Notes must be less than 1000 characters").optional(),
	specialRequests: z.string().max(1000, "Special requests must be less than 1000 characters").optional(),
	status: z.enum(["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"], {
		required_error: "Status is required",
		invalid_type_error: "Status must be one of: PENDING, CONFIRMED, CANCELLED, COMPLETED, NO_SHOW"
	}).default("PENDING"),
	paymentStatus: z.enum(["PENDING", "PAID", "REFUNDED", "PARTIAL"], {
		invalid_type_error: "Payment status must be one of: PENDING, PAID, REFUNDED, PARTIAL"
	}).default("PENDING"),
	totalAmount: z.number().min(0, "Total amount must be non-negative").optional(),
	currency: z.string().length(3, "Currency must be a 3-letter code").optional(),
});

export const ServiceReviewSchema = z.object({
	serviceId: z.number().int().positive("Service ID must be a positive integer"),
	reviewerId: z.number().int().positive("Reviewer ID must be a positive integer"),
	revieweeId: z.number().int().positive("Reviewee ID must be a positive integer"),
	bookingId: z.number().int().positive("Booking ID must be a positive integer").optional(),
	rating: z.number().int().min(1, "Rating must be at least 1").max(5, "Rating must be at most 5"),
	review: z.string().max(1000, "Review must be less than 1000 characters").optional(),
	communicationRating: z.number().int().min(1, "Communication rating must be at least 1").max(5, "Communication rating must be at most 5").optional(),
	punctualityRating: z.number().int().min(1, "Punctuality rating must be at least 1").max(5, "Punctuality rating must be at most 5").optional(),
	skillRating: z.number().int().min(1, "Skill rating must be at least 1").max(5, "Skill rating must be at most 5").optional(),
	wouldRecommend: z.boolean().optional(),
	tags: z.array(z.string().max(50, "Tag must be less than 50 characters")).max(10, "Maximum 10 tags allowed").optional(),
});

export const UserServicesQuerySchema = z.object({
	page: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().int().min(1)).default("1"),
	limit: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().int().min(1).max(100)).default("10"),
	serviceTypeId: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().int().positive()).optional(),
	userId: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().int().positive()).optional(),
	experienceLevel: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "PROFESSIONAL"]).optional(),
	rateMin: z.string().transform((val) => parseFloat(val)).pipe(z.number().min(0)).optional(),
	rateMax: z.string().transform((val) => parseFloat(val)).pipe(z.number().min(0)).optional(),
	currency: z.string().length(3).optional(),
	location: z.string().optional(),
	lat: z.string().transform((val) => parseFloat(val)).pipe(z.number().min(-90).max(90)).optional(),
	lng: z.string().transform((val) => parseFloat(val)).pipe(z.number().min(-180).max(180)).optional(),
	radius: z.string().transform((val) => parseFloat(val)).pipe(z.number().min(0)).optional(),
	available: z.string().transform((val) => val === "true").pipe(z.boolean()).optional(),
	search: z.string().optional(),
});

export type UserServicesServerSchemaType = z.infer<typeof UserServicesServerSchema>;
export type UserServicesUpdateSchemaType = z.infer<typeof UserServicesUpdateSchema>;
export type ServiceBookingSchemaType = z.infer<typeof ServiceBookingSchema>;
export type ServiceReviewSchemaType = z.infer<typeof ServiceReviewSchema>;
export type UserServicesQuerySchemaType = z.infer<typeof UserServicesQuerySchema>;

import { z } from "zod";
import { zodMessages } from "@/core/messages";

export const NotificationsServerSchema = z.object({
	userId: z.number().int().positive("User ID must be a positive integer"),
	type: z.enum(["SYSTEM", "MESSAGE", "EVENT", "GROUP", "SERVICE", "BOOKING", "REVIEW", "MENTION", "LIKE", "COMMENT", "FRIEND_REQUEST", "GROUP_INVITE", "EVENT_REMINDER", "PAYMENT", "SECURITY"], {
		required_error: "Notification type is required",
		invalid_type_error: "Notification type must be one of the valid types"
	}),
	title: z.string().min(1, "Title is required").max(255, "Title must be less than 255 characters"),
	message: z.string().min(1, "Message is required").max(1000, "Message must be less than 1000 characters"),
	priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"], {
		invalid_type_error: "Priority must be one of: LOW, NORMAL, HIGH, URGENT"
	}).default("NORMAL"),
	relatedUserId: z.number().int().positive("Related user ID must be a positive integer").optional(),
	relatedEntityType: z.string().max(50, "Related entity type must be less than 50 characters").optional(),
	relatedEntityId: z.number().int().positive("Related entity ID must be a positive integer").optional(),
	imageUrl: z.string().url("Image URL must be a valid URL").optional(),
	actionUrl: z.string().url("Action URL must be a valid URL").optional(),
	metadata: z.record(z.any()).optional(),
});

export const NotificationsUpdateSchema = z.object({
	status: z.enum(["UNREAD", "READ", "ARCHIVED", "DELETED"], {
		invalid_type_error: "Status must be one of: UNREAD, READ, ARCHIVED, DELETED"
	}).optional(),
	readAt: z.date({
		invalid_type_error: "Read date must be a valid date"
	}).optional(),
	archivedAt: z.date({
		invalid_type_error: "Archived date must be a valid date"
	}).optional(),
});

export const NotificationSettingsSchema = z.object({
	emailEnabled: z.boolean().optional(),
	pushEnabled: z.boolean().optional(),
	inAppEnabled: z.boolean().optional(),
	systemNotifications: z.boolean().optional(),
	messageNotifications: z.boolean().optional(),
	eventNotifications: z.boolean().optional(),
	groupNotifications: z.boolean().optional(),
	serviceNotifications: z.boolean().optional(),
	bookingNotifications: z.boolean().optional(),
	reviewNotifications: z.boolean().optional(),
	mentionNotifications: z.boolean().optional(),
	likeNotifications: z.boolean().optional(),
	commentNotifications: z.boolean().optional(),
	friendRequestNotifications: z.boolean().optional(),
	groupInviteNotifications: z.boolean().optional(),
	eventReminderNotifications: z.boolean().optional(),
	paymentNotifications: z.boolean().optional(),
	securityNotifications: z.boolean().optional(),
	digestFrequency: z.enum(["IMMEDIATE", "DAILY", "WEEKLY", "NEVER"], {
		invalid_type_error: "Digest frequency must be one of: IMMEDIATE, DAILY, WEEKLY, NEVER"
	}).optional(),
	quietHoursStart: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Quiet hours start must be in HH:MM format").optional(),
	quietHoursEnd: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Quiet hours end must be in HH:MM format").optional(),
	timezone: z.string().max(50, "Timezone must be less than 50 characters").optional(),
});

export const NotificationQuerySchema = z.object({
	page: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().int().min(1)).default("1"),
	limit: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().int().min(1).max(100)).default("10"),
	type: z.enum(["SYSTEM", "MESSAGE", "EVENT", "GROUP", "SERVICE", "BOOKING", "REVIEW", "MENTION", "LIKE", "COMMENT", "FRIEND_REQUEST", "GROUP_INVITE", "EVENT_REMINDER", "PAYMENT", "SECURITY"]).optional(),
	status: z.enum(["UNREAD", "READ", "ARCHIVED", "DELETED"]).optional(),
	priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
	userId: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().int().positive()).optional(),
});

export const NotificationTemplateSchema = z.object({
	name: z.string().min(1, "Template name is required").max(100, "Template name must be less than 100 characters"),
	type: z.enum(["SYSTEM", "MESSAGE", "EVENT", "GROUP", "SERVICE", "BOOKING", "REVIEW", "MENTION", "LIKE", "COMMENT", "FRIEND_REQUEST", "GROUP_INVITE", "EVENT_REMINDER", "PAYMENT", "SECURITY"], {
		required_error: "Template type is required",
		invalid_type_error: "Template type must be one of the valid types"
	}),
	subject: z.string().min(1, "Subject is required").max(255, "Subject must be less than 255 characters"),
	body: z.string().min(1, "Body is required").max(2000, "Body must be less than 2000 characters"),
	variables: z.array(z.string().max(50, "Variable name must be less than 50 characters")).max(20, "Maximum 20 variables allowed").optional(),
	isActive: z.boolean().default(true),
});

export type NotificationsServerSchemaType = z.infer<typeof NotificationsServerSchema>;
export type NotificationsUpdateSchemaType = z.infer<typeof NotificationsUpdateSchema>;
export type NotificationSettingsSchemaType = z.infer<typeof NotificationSettingsSchema>;
export type NotificationQuerySchemaType = z.infer<typeof NotificationQuerySchema>;
export type NotificationTemplateSchemaType = z.infer<typeof NotificationTemplateSchema>;

import { z } from "zod";
import { zodMessages } from "@/core/messages";

export const GroupsServerSchema = z.object({
	name: z.string().min(1, "Group name is required").max(255, "Group name must be less than 255 characters"),
	slug: z.string().min(1, "Slug is required").max(255, "Slug must be less than 255 characters").regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
	description: z.string().max(1000, "Description must be less than 1000 characters").optional(),
	type: z.enum(["PUBLIC", "PRIVATE", "INVITE_ONLY", "CLOSED"], {
		required_error: "Group type is required",
		invalid_type_error: "Group type must be one of: PUBLIC, PRIVATE, INVITE_ONLY, CLOSED"
	}).default("PUBLIC"),
	location: z.string().max(255, "Location must be less than 255 characters").optional(),
	lat: z.number().min(-90).max(90, "Latitude must be between -90 and 90").optional(),
	lng: z.number().min(-180).max(180, "Longitude must be between -180 and 180").optional(),
	createdBy: z.number().int().positive("Creator ID must be a positive integer"),
	imageUrl: z.string().url("Image URL must be a valid URL").optional(),
	website: z.string().url("Website must be a valid URL").optional(),
	tags: z.array(z.string().max(50, "Tag must be less than 50 characters")).max(10, "Maximum 10 tags allowed").optional(),
});

export const GroupsUpdateSchema = z.object({
	name: z.string().min(1, "Group name is required").max(255, "Group name must be less than 255 characters").optional(),
	description: z.string().max(1000, "Description must be less than 1000 characters").optional(),
	type: z.enum(["PUBLIC", "PRIVATE", "INVITE_ONLY", "CLOSED"], {
		invalid_type_error: "Group type must be one of: PUBLIC, PRIVATE, INVITE_ONLY, CLOSED"
	}).optional(),
	status: z.enum(["ACTIVE", "ARCHIVED", "DELETED"], {
		invalid_type_error: "Status must be one of: ACTIVE, ARCHIVED, DELETED"
	}).optional(),
	location: z.string().max(255, "Location must be less than 255 characters").optional(),
	lat: z.number().min(-90).max(90, "Latitude must be between -90 and 90").optional(),
	lng: z.number().min(-180).max(180, "Longitude must be between -180 and 180").optional(),
	imageUrl: z.string().url("Image URL must be a valid URL").optional(),
	website: z.string().url("Website must be a valid URL").optional(),
	tags: z.array(z.string().max(50, "Tag must be less than 50 characters")).max(10, "Maximum 10 tags allowed").optional(),
});

export const GroupMemberSchema = z.object({
	groupId: z.number().int().positive("Group ID must be a positive integer"),
	userId: z.number().int().positive("User ID must be a positive integer"),
	role: z.enum(["MEMBER", "MODERATOR", "ADMIN"], {
		required_error: "Role is required",
		invalid_type_error: "Role must be one of: MEMBER, MODERATOR, ADMIN"
	}).default("MEMBER"),
	status: z.enum(["ACTIVE", "PENDING", "BANNED"], {
		required_error: "Status is required",
		invalid_type_error: "Status must be one of: ACTIVE, PENDING, BANNED"
	}).default("ACTIVE"),
});

export const GroupPostSchema = z.object({
	groupId: z.number().int().positive("Group ID must be a positive integer"),
	authorId: z.number().int().positive("Author ID must be a positive integer"),
	title: z.string().max(200, "Title must be less than 200 characters").optional(),
	content: z.string().min(1, "Content is required").max(5000, "Content must be less than 5000 characters"),
	postType: z.enum(["text", "image", "video", "link", "poll"], {
		required_error: "Post type is required",
		invalid_type_error: "Post type must be one of: text, image, video, link, poll"
	}).default("text"),
	imageUrl: z.string().url("Image URL must be a valid URL").optional(),
	videoUrl: z.string().url("Video URL must be a valid URL").optional(),
	linkUrl: z.string().url("Link URL must be a valid URL").optional(),
	tags: z.array(z.string().max(50, "Tag must be less than 50 characters")).max(5, "Maximum 5 tags allowed").optional(),
});

export const GroupCommentSchema = z.object({
	postId: z.number().int().positive("Post ID must be a positive integer"),
	userId: z.number().int().positive("User ID must be a positive integer"),
	content: z.string().min(1, "Content is required").max(1000, "Content must be less than 1000 characters"),
	parentId: z.number().int().positive("Parent comment ID must be a positive integer").optional(),
});

export const GroupQuerySchema = z.object({
	page: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().int().min(1)).default("1"),
	limit: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().int().min(1).max(100)).default("10"),
	type: z.enum(["PUBLIC", "PRIVATE", "INVITE_ONLY", "CLOSED"]).optional(),
	status: z.enum(["ACTIVE", "ARCHIVED", "DELETED"]).optional(),
	location: z.string().optional(),
	search: z.string().optional(),
});

export type GroupsServerSchemaType = z.infer<typeof GroupsServerSchema>;
export type GroupsUpdateSchemaType = z.infer<typeof GroupsUpdateSchema>;
export type GroupMemberSchemaType = z.infer<typeof GroupMemberSchema>;
export type GroupPostSchemaType = z.infer<typeof GroupPostSchema>;
export type GroupCommentSchemaType = z.infer<typeof GroupCommentSchema>;
export type GroupQuerySchemaType = z.infer<typeof GroupQuerySchema>;

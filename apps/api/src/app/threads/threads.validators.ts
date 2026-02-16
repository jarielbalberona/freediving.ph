import { z } from "zod";
import { zodMessages } from "@/core/messages";

export const ThreadsServerSchema = z.object({
	userId: z.number().int().positive(),
	title: z.string().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
	content: z.string().min(1, "Content is required").max(2000, "Content must be less than 2000 characters")
});

export const ThreadsUpdateSchema = z.object({
	title: z.string().min(1, "Title is required").max(200, "Title must be less than 200 characters").optional(),
	content: z.string().min(1, "Content is required").max(2000, "Content must be less than 2000 characters").optional()
});

export const CommentCreateSchema = z.object({
	userId: z.number().int().positive(),
	threadId: z.number().int().positive(),
	parentId: z.number().int().positive().optional(),
	content: z.string().min(1, "Content is required").max(1000, "Content must be less than 1000 characters")
});

export const ReactionSchema = z.object({
	userId: z.number().int().positive(),
	type: z.enum(["1", "0"], {
		required_error: "Reaction type is required",
		invalid_type_error: "Reaction type must be '1' (like) or '0' (dislike)"
	})
});

export type ThreadsServerSchemaType = z.infer<typeof ThreadsServerSchema>;
export type ThreadsUpdateSchemaType = z.infer<typeof ThreadsUpdateSchema>;
export type CommentCreateSchemaType = z.infer<typeof CommentCreateSchema>;
export type ReactionSchemaType = z.infer<typeof ReactionSchema>;

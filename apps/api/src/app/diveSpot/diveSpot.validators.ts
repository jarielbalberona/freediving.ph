import { z } from "zod";
import { zodMessages } from "@/core/messages";
import { validateString } from "@/validators/commonRules";
import { PaginationQuerySchema } from "@/validators/pagination.schema";
import { DIVE_DIFFICULTY } from "@/databases/drizzle/lists";

export const DiveSpotServerSchema = z.object({
	name: validateString("Name"),
	depth: z.number().int().positive().optional(),
	difficulty: z.enum(DIVE_DIFFICULTY.enumValues, {
		required_error: zodMessages.error.required.fieldIsRequired("difficulty"),
		invalid_type_error: zodMessages.error.invalid.invalidEnum("difficulty", DIVE_DIFFICULTY.enumValues)
	}),
	lat: z.number().min(-90).max(90).optional(),
	lng: z.number().min(-180).max(180).optional(),
	locationName: z.string().optional(),
	description: z.string().optional(),
	bestSeason: z.string().optional(),
	directions: z.string().optional(),
	imageUrl: z.string().optional(),
});

export const DiveSpotReviewSchema = z.object({
	state: z.enum(["PUBLISHED", "FLAGGED", "REMOVED"])
});

export const DiveSpotReviewListQuerySchema = PaginationQuerySchema.extend({
	sort: z.enum(["newest", "oldest"]).default("newest")
});

export const DiveSpotReviewCreateSchema = z.object({
	rating: z.coerce.number().int().min(1).max(5),
	comment: z.string().trim().max(1200).optional()
});

export const DiveSpotListQuerySchema = PaginationQuerySchema.extend({
	search: z.string().trim().max(120).optional(),
	location: z.string().trim().max(120).optional(),
	difficulty: z.enum(DIVE_DIFFICULTY.enumValues).optional(),
	north: z.coerce.number().min(-90).max(90).optional(),
	south: z.coerce.number().min(-90).max(90).optional(),
	east: z.coerce.number().min(-180).max(180).optional(),
	west: z.coerce.number().min(-180).max(180).optional(),
	shape: z.enum(["map", "list"]).default("list"),
	sort: z.enum(["newest", "oldest", "name"]).default("newest")
})
	.refine((query) => query.north === undefined || query.south === undefined || query.north >= query.south, {
		path: ["north"],
		message: "north must be greater than or equal to south"
	})
	.refine((query) => query.east === undefined || query.west === undefined || query.east >= query.west, {
		path: ["east"],
		message: "east must be greater than or equal to west"
	});

export type DiveSpotServerSchemaType = z.infer<typeof DiveSpotServerSchema>;
export type DiveSpotReviewSchemaType = z.infer<typeof DiveSpotReviewSchema>;
export type DiveSpotListQuerySchemaType = z.infer<typeof DiveSpotListQuerySchema>;
export type DiveSpotReviewListQuerySchemaType = z.infer<typeof DiveSpotReviewListQuerySchema>;
export type DiveSpotReviewCreateSchemaType = z.infer<typeof DiveSpotReviewCreateSchema>;

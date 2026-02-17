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

export const DiveSpotListQuerySchema = PaginationQuerySchema.extend({
	search: z.string().trim().max(120).optional(),
	location: z.string().trim().max(120).optional(),
	difficulty: z.enum(DIVE_DIFFICULTY.enumValues).optional(),
	north: z.coerce.number().min(-90).max(90).optional(),
	south: z.coerce.number().min(-90).max(90).optional(),
	east: z.coerce.number().min(-180).max(180).optional(),
	west: z.coerce.number().min(-180).max(180).optional(),
	sort: z.enum(["newest", "oldest", "name"]).default("newest")
});

export type DiveSpotServerSchemaType = z.infer<typeof DiveSpotServerSchema>;
export type DiveSpotReviewSchemaType = z.infer<typeof DiveSpotReviewSchema>;
export type DiveSpotListQuerySchemaType = z.infer<typeof DiveSpotListQuerySchema>;

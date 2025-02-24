import { z } from "zod";
import { zodMessages } from "@/core/messages";
import { validateString } from "@/validators/commonRules";
import { DIVE_DIFFICULTY } from "@/databases/drizzle/lists";

export const DiveSpotServerSchema = z.object({
	name: validateString("Name"),
	location: z.string().min(3, "Location must be in 'latitude,longitude' format"),
	depth: z.number().int().positive().optional(),
	difficulty: z.enum(DIVE_DIFFICULTY.enumValues, {
		required_error: zodMessages.error.required.fieldIsRequired("difficulty"),
		invalid_type_error: zodMessages.error.invalid.invalidEnum("difficulty", DIVE_DIFFICULTY.enumValues)
	}),
	description: z.string().optional(),
	bestSeason: z.string().optional()
});

export type DiveSpotServerSchemaType = z.infer<typeof DiveSpotServerSchema>;

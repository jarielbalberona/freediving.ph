import { z } from "zod";

export const ModerateThreadActionSchema = z.object({
	reasonCode: z.enum(["SPAM", "HARASSMENT", "DOXXING", "IMPERSONATION", "HATE", "MISINFORMATION", "SCAM", "SAFETY", "OTHER"]),
	note: z.string().trim().max(500).optional()
});

export const ModerateUserSuspensionSchema = z.object({
	action: z.enum(["SUSPEND", "REACTIVATE"]),
	reasonCode: z.enum(["SPAM", "HARASSMENT", "DOXXING", "IMPERSONATION", "HATE", "MISINFORMATION", "SCAM", "SAFETY", "OTHER"]).optional(),
	note: z.string().trim().max(500).optional()
});

export const ModerateFeatureRestrictionSchema = z.object({
	restrictionType: z.enum(["DM_DISABLED", "CHIKA_POSTING_DISABLED"]),
	isActive: z.boolean(),
	reasonCode: z.enum(["SPAM", "HARASSMENT", "DOXXING", "IMPERSONATION", "HATE", "MISINFORMATION", "SCAM", "SAFETY", "OTHER"]).optional(),
	note: z.string().trim().max(500).optional()
});

export type ModerateThreadActionSchemaType = z.infer<typeof ModerateThreadActionSchema>;
export type ModerateUserSuspensionSchemaType = z.infer<typeof ModerateUserSuspensionSchema>;
export type ModerateFeatureRestrictionSchemaType = z.infer<typeof ModerateFeatureRestrictionSchema>;

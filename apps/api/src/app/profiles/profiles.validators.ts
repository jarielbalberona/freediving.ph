import { z } from "zod";

const visibilityValues = ["PUBLIC", "MEMBERS_ONLY", "PRIVATE"] as const;

export const UpdateOwnProfileSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  bio: z.string().trim().max(1000).optional(),
  location: z.string().trim().max(120).optional(),
  homeDiveArea: z.string().trim().max(120).optional(),
  experienceLevel: z.string().trim().max(80).optional(),
  visibility: z.enum(["PUBLIC", "MEMBERS_ONLY"]).optional(),
  buddyFinderVisibility: z.enum(["VISIBLE", "HIDDEN"]).optional(),
});

export const CreatePersonalBestSchema = z.object({
  discipline: z.enum(["STA", "DYN", "DYNB", "DNF", "CWT", "CWTB", "FIM", "CNF", "VWT", "OTHER"]),
  resultValue: z.string().trim().min(1).max(50),
  resultUnit: z.string().trim().min(1).max(20),
  recordedAt: z.coerce.date().optional(),
  visibility: z.enum(visibilityValues).default("PUBLIC"),
});

export const UpdatePersonalBestSchema = CreatePersonalBestSchema.partial();

export type UpdateOwnProfileSchemaType = z.infer<typeof UpdateOwnProfileSchema>;
export type CreatePersonalBestSchemaType = z.infer<typeof CreatePersonalBestSchema>;
export type UpdatePersonalBestSchemaType = z.infer<typeof UpdatePersonalBestSchema>;

import { z } from "zod";

export const CollaborationCreateSchema = z.object({
  postType: z.enum(["LOOKING_FOR", "OFFERING"]),
  title: z.string().trim().min(2).max(200),
  body: z.string().trim().min(10),
  region: z.string().trim().max(120).optional(),
  specialty: z.string().trim().max(120).optional(),
});

export const CollaborationQuerySchema = z.object({
  postType: z.enum(["LOOKING_FOR", "OFFERING"]).optional(),
  region: z.string().trim().max(120).optional(),
  specialty: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export const CollaborationModerateSchema = z.object({
  isActive: z.boolean(),
});

export type CollaborationCreateSchemaType = z.infer<typeof CollaborationCreateSchema>;
export type CollaborationQuerySchemaType = z.infer<typeof CollaborationQuerySchema>;
export type CollaborationModerateSchemaType = z.infer<typeof CollaborationModerateSchema>;

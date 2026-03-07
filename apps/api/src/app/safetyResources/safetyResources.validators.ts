import { z } from "zod";

export const SafetyPageCreateSchema = z.object({
  slug: z.string().trim().min(2).max(120),
  title: z.string().trim().min(2).max(200),
  content: z.string().trim().min(20),
  isPublished: z.boolean().default(false),
});

export const SafetyPageUpdateSchema = z.object({
  title: z.string().trim().min(2).max(200).optional(),
  content: z.string().trim().min(20).optional(),
  isPublished: z.boolean().optional(),
});

export const SafetyPageRollbackSchema = z.object({
  versionId: z.number().int().positive(),
});

export const SafetyContactCreateSchema = z.object({
  region: z.string().trim().min(2).max(100),
  label: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(3).max(60),
  source: z.string().trim().min(3).max(300),
  isPublished: z.boolean().default(true),
});

export type SafetyPageCreateSchemaType = z.infer<typeof SafetyPageCreateSchema>;
export type SafetyContactCreateSchemaType = z.infer<typeof SafetyContactCreateSchema>;
export type SafetyPageUpdateSchemaType = z.infer<typeof SafetyPageUpdateSchema>;
export type SafetyPageRollbackSchemaType = z.infer<typeof SafetyPageRollbackSchema>;

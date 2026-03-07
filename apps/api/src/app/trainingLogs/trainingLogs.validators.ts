import { z } from "zod";

export const TrainingLogCreateSchema = z.object({
  title: z.string().trim().min(2).max(200),
  notes: z.string().trim().max(4000).optional(),
  sessionDate: z.coerce.date(),
  visibility: z.enum(["PRIVATE", "BUDDIES_ONLY", "PUBLIC"]).default("PRIVATE"),
  metrics: z
    .array(
      z.object({
        metricKey: z.string().trim().min(1).max(80),
        metricValue: z.string().trim().min(1).max(120),
        metricUnit: z.string().trim().max(20).optional(),
      }),
    )
    .default([]),
});

export const TrainingLogQuerySchema = z.object({
  userId: z.coerce.number().int().positive().optional(),
  visibility: z.enum(["PRIVATE", "BUDDIES_ONLY", "PUBLIC"]).optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export const TrainingLogUpdateSchema = z.object({
  title: z.string().trim().min(2).max(200).optional(),
  notes: z.string().trim().max(4000).optional(),
  sessionDate: z.coerce.date().optional(),
  visibility: z.enum(["PRIVATE", "BUDDIES_ONLY", "PUBLIC"]).optional(),
});

export const TrainingMetricUpsertSchema = z.object({
  metricKey: z.string().trim().min(1).max(80),
  metricValue: z.string().trim().min(1).max(120),
  metricUnit: z.string().trim().max(20).optional(),
});

export type TrainingLogCreateSchemaType = z.infer<typeof TrainingLogCreateSchema>;
export type TrainingLogQuerySchemaType = z.infer<typeof TrainingLogQuerySchema>;
export type TrainingLogUpdateSchemaType = z.infer<typeof TrainingLogUpdateSchema>;
export type TrainingMetricUpsertSchemaType = z.infer<typeof TrainingMetricUpsertSchema>;

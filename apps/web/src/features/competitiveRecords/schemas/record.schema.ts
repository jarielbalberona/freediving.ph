import { z } from "zod";

export const createRecordSchema = z.object({
  athleteName: z.string().min(1, "Athlete name is required").trim(),
  discipline: z.string().min(1, "Discipline is required").trim(),
  resultValue: z.string().min(1, "Result value is required").trim(),
  resultUnit: z.string().min(1, "Result unit is required").trim(),
  eventName: z.string().min(1, "Event name is required").trim(),
  eventDate: z.string().min(1, "Event date is required"),
});

export const recordFilterSchema = z.object({
  athlete: z.string().optional(),
  discipline: z.string().optional(),
  eventName: z.string().optional(),
});

export type CreateRecordValues = z.infer<typeof createRecordSchema>;
export type RecordFilterValues = z.infer<typeof recordFilterSchema>;

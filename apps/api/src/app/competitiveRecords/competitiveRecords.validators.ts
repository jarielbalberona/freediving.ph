import { z } from "zod";

export const CompetitiveRecordCreateSchema = z.object({
  athleteName: z.string().trim().min(2).max(120),
  discipline: z.string().trim().min(2).max(30),
  resultValue: z.string().trim().min(1).max(50),
  resultUnit: z.string().trim().min(1).max(20),
  eventName: z.string().trim().min(2).max(200),
  eventDate: z.coerce.date(),
  sourceUrl: z.string().url().optional(),
});

export const CompetitiveRecordVerifySchema = z.object({
  action: z.enum(["VERIFY", "REJECT", "REMOVE"]),
  note: z.string().trim().max(500).optional(),
});

export const CompetitiveRecordQuerySchema = z.object({
  discipline: z.string().trim().max(30).optional(),
  athlete: z.string().trim().max(120).optional(),
  eventName: z.string().trim().max(200).optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export type CompetitiveRecordCreateSchemaType = z.infer<typeof CompetitiveRecordCreateSchema>;
export type CompetitiveRecordVerifySchemaType = z.infer<typeof CompetitiveRecordVerifySchema>;
export type CompetitiveRecordQuerySchemaType = z.infer<typeof CompetitiveRecordQuerySchema>;

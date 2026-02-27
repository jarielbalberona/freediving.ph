import { z } from "zod";

export const reportSchema = z.object({
  reasonCode: z.enum(["spam", "harassment", "impersonation", "unsafe", "other"]),
  details: z.string().max(2000).optional(),
});

export type ReportValues = z.infer<typeof reportSchema>;

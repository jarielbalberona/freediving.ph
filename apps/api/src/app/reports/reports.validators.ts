import { z } from "zod";

export const CreateReportSchema = z.object({
  targetType: z.enum([
    "USER",
    "PROFILE",
    "PERSONAL_BEST",
    "PROFILE_ACTIVITY_ITEM",
    "THREAD",
    "POST",
    "CONVERSATION",
    "MESSAGE",
    "GROUP",
    "EVENT",
    "DIVE_SITE",
    "COMPETITIVE_RECORD",
    "TRAINING_LOG",
    "SAFETY_RESOURCE",
    "AWARENESS_POST",
    "MARKETPLACE_LISTING",
    "COLLABORATION_POST",
    "OTHER",
  ]),
  targetId: z.string().trim().min(1).max(120),
  reasonCode: z.enum(["SPAM", "HARASSMENT", "DOXXING", "IMPERSONATION", "HATE", "MISINFORMATION", "SCAM", "SAFETY", "OTHER"]),
  text: z.string().trim().max(2000).optional(),
});

export const ReportQuerySchema = z.object({
  status: z.enum(["OPEN", "UNDER_REVIEW", "RESOLVED", "DISMISSED"]).optional(),
  targetType: z
    .enum([
      "USER",
      "PROFILE",
      "PERSONAL_BEST",
      "PROFILE_ACTIVITY_ITEM",
      "THREAD",
      "POST",
      "CONVERSATION",
      "MESSAGE",
      "GROUP",
      "EVENT",
      "DIVE_SITE",
      "COMPETITIVE_RECORD",
      "TRAINING_LOG",
      "SAFETY_RESOURCE",
      "AWARENESS_POST",
      "MARKETPLACE_LISTING",
      "COLLABORATION_POST",
      "OTHER",
    ])
    .optional(),
  reasonCode: z.enum(["SPAM", "HARASSMENT", "DOXXING", "IMPERSONATION", "HATE", "MISINFORMATION", "SCAM", "SAFETY", "OTHER"]).optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export const UpdateReportStatusSchema = z.object({
  status: z.enum(["UNDER_REVIEW", "RESOLVED", "DISMISSED"]),
  resolutionNote: z.string().trim().min(1).max(2000).optional(),
});

export type CreateReportSchemaType = z.infer<typeof CreateReportSchema>;
export type ReportQuerySchemaType = z.infer<typeof ReportQuerySchema>;
export type UpdateReportStatusSchemaType = z.infer<typeof UpdateReportStatusSchema>;

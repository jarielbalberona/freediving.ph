import { z } from "zod";

export const AwarenessCreateSchema = z.object({
  title: z.string().trim().min(2).max(200),
  body: z.string().trim().min(10),
  topicType: z.enum(["REMINDER", "ETIQUETTE", "ADVISORY", "TOURISM_NOTE"]),
  sourceUrl: z.string().url().optional(),
}).superRefine((value, ctx) => {
  if (value.topicType === "ADVISORY" && !value.sourceUrl) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["sourceUrl"],
      message: "Advisories require a source URL citation",
    });
  }
});

export const AwarenessQuerySchema = z.object({
  topicType: z.enum(["REMINDER", "ETIQUETTE", "ADVISORY", "TOURISM_NOTE"]).optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export type AwarenessCreateSchemaType = z.infer<typeof AwarenessCreateSchema>;
export type AwarenessQuerySchemaType = z.infer<typeof AwarenessQuerySchema>;

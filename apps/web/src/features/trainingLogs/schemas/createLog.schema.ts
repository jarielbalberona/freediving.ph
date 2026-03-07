import { z } from "zod";

export const createTrainingLogSchema = z.object({
  title: z.string().min(1, "Title is required").trim(),
  sessionDate: z.string().min(1, "Session date is required"),
  visibility: z.enum(["PRIVATE", "BUDDIES_ONLY", "PUBLIC"]),
});

export type CreateTrainingLogValues = z.infer<typeof createTrainingLogSchema>;

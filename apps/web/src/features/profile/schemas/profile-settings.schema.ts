import { z } from "zod";

export const profileSettingsSchema = z.object({
  displayName: z
    .string()
    .trim()
    .max(80, "Display name must be at most 80 characters"),
  bio: z.string().trim().max(500, "Bio must be at most 500 characters"),
});

export type ProfileSettingsValues = z.infer<typeof profileSettingsSchema>;

import { z } from "zod";

export const createMediaPostSchema = z.object({
  diveSiteId: z.string().min(1, "Choose a dive site"),
  postCaption: z
    .string()
    .max(1000, "Caption must be 1000 characters or less")
    .optional(),
  items: z
    .array(
      z.object({
        localId: z.string().min(1),
      }),
    )
    .min(1, "Add at least one photo")
    .max(10, "You can upload up to 10 photos"),
});

export type CreateMediaPostValues = z.infer<typeof createMediaPostSchema>;

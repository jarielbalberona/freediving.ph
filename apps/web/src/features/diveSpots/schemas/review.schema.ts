import { z } from "zod";

export const diveSpotReviewSchema = z.object({
  rating: z.coerce.number().min(1, "Rating must be at least 1").max(5, "Rating must be at most 5"),
  comment: z.string().max(2000).optional(),
});

export type DiveSpotReviewValues = z.infer<typeof diveSpotReviewSchema>;

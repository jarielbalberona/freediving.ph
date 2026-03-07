import { z } from "zod";

export const mediaUploadSchema = z.object({
  contextType: z.enum([
    "profile_avatar",
    "profile_feed",
    "chika_attachment",
    "event_attachment",
    "dive_spot_attachment",
    "group_cover",
  ]),
  contextId: z.string().optional(),
});

export type MediaUploadValues = z.infer<typeof mediaUploadSchema>;

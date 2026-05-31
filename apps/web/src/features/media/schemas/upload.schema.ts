import { z } from "zod";

export const mediaUploadSchema = z.object({
  contextType: z.enum([
    "profile_avatar",
    "profile_feed",
    "chika_attachment",
    "event_attachment",
    "event_logo",
    "event_cover",
    "school_logo",
    "school_cover",
    "payment_method_qr",
    "course_booking_receipt",
    "dive_spot_attachment",
    "group_logo",
    "group_cover",
    "instructor_certification_proof",
    "badge_proof",
  ]),
  contextId: z.string().optional(),
});

export type MediaUploadValues = z.infer<typeof mediaUploadSchema>;

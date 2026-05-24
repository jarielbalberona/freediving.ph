import { z } from "zod";

const optionalEmail = z
  .string()
  .refine(
    (value) =>
      value.trim() === "" || z.string().email().safeParse(value.trim()).success,
    "Enter a valid email address",
  );

const optionalUrl = z.string().refine((value) => {
  if (value.trim() === "") return true;
  try {
    const url = new URL(value.trim());
    return Boolean(url.protocol && url.hostname);
  } catch {
    return false;
  }
}, "Enter a valid URL, including a scheme such as https://");

export const schoolFormSchema = z.object({
  name: z.string().trim().min(1, "School name is required"),
  shortDescription: z.string(),
  descriptionMarkdown: z.string(),
  baseLocation: z.string(),
  baseLocationLabel: z.string(),
  formattedAddress: z.string(),
  regionCode: z.string(),
  regionName: z.string(),
  provinceCode: z.string(),
  provinceName: z.string(),
  cityCode: z.string(),
  cityName: z.string(),
  barangayCode: z.string(),
  barangayName: z.string(),
  locationSource: z.string(),
  diveSiteId: z.string(),
  contactEmail: optionalEmail,
  contactPhone: z.string(),
  websiteUrl: optionalUrl,
  facebookUrl: optionalUrl,
  instagramUrl: optionalUrl,
  status: z.enum(["draft", "published", "suspended"]).optional(),
});

export type SchoolFormValues = z.infer<typeof schoolFormSchema>;

import { z } from "zod";

const locationSchema = z.object({
  lat: z
    .number()
    .min(-90, "Latitude must be at least -90")
    .max(90, "Latitude must be at most 90"),
  lng: z
    .number()
    .min(-180, "Longitude must be at least -180")
    .max(180, "Longitude must be at most 180"),
  area: z.string().max(120).optional(),
});

export const siteSubmissionSchema = z
  .object({
    name: z.string().min(3, "Name must be at least 3 characters").max(120),
    location: locationSchema.nullable(),
    entryDifficulty: z.enum(["easy", "moderate", "hard"]),
    depthMinM: z.string().optional(),
    depthMaxM: z.string().optional(),
    hazards: z.string().optional(),
    bestSeason: z.string().max(160).optional(),
    typicalConditions: z.string().max(500).optional(),
    access: z.string().max(500).optional(),
    fees: z.string().max(280).optional(),
    contactInfo: z.string().max(280).optional(),
  })
  .refine((data) => data.location !== null, {
    message: "Pick the dive spot on the map before submitting",
    path: ["location"],
  })
  .refine(
    (data) => {
      const minS = data.depthMinM?.trim();
      const maxS = data.depthMaxM?.trim();
      if (!minS || !maxS) return true;
      const min = Number(minS);
      const max = Number(maxS);
      return Number.isFinite(min) && Number.isFinite(max) && min <= max;
    },
    {
      message: "Min depth must be less than or equal to max depth",
      path: ["depthMinM"],
    },
  );

export type SiteSubmissionValues = z.infer<typeof siteSubmissionSchema>;

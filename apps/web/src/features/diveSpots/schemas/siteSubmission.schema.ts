import { z } from "zod";

export const siteSubmissionLimits = {
  name: { min: 3, max: 120 },
  area: { max: 120 },
  description: { min: 12, max: 2000 },
  hazard: { max: 60 },
  bestSeason: { max: 160 },
  typicalConditions: { max: 500 },
  access: { max: 500 },
  fees: { max: 280 },
  depthM: { min: 0, max: 2000 },
} as const;

const optionalDepth = z
  .string()
  .optional()
  .refine(
    (value) => {
      const trimmed = value?.trim();
      if (!trimmed) return true;
      return Number.isFinite(Number(trimmed));
    },
    { message: "Depth must be a number" },
  )
  .refine(
    (value) => {
      const trimmed = value?.trim();
      if (!trimmed) return true;
      const parsed = Number(trimmed);
      return (
        parsed >= siteSubmissionLimits.depthM.min &&
        parsed <= siteSubmissionLimits.depthM.max
      );
    },
    { message: "Depth must be between 0 and 2000 meters" },
  );

const hazardItems = (value: string | undefined) =>
  (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const locationSchema = z.object({
  lat: z
    .number()
    .min(-90, "Latitude must be at least -90")
    .max(90, "Latitude must be at most 90"),
  lng: z
    .number()
    .min(-180, "Longitude must be at least -180")
    .max(180, "Longitude must be at most 180"),
  area: z.string().max(siteSubmissionLimits.area.max).optional(),
});

export const siteSubmissionSchema = z
  .object({
    name: z
      .string()
      .min(
        siteSubmissionLimits.name.min,
        `Name must be at least ${siteSubmissionLimits.name.min} characters`,
      )
      .max(
        siteSubmissionLimits.name.max,
        `Name must be at most ${siteSubmissionLimits.name.max} characters`,
      ),
    location: locationSchema.nullable(),
    description: z
      .string()
      .min(
        siteSubmissionLimits.description.min,
        `Description must be at least ${siteSubmissionLimits.description.min} characters`,
      )
      .max(
        siteSubmissionLimits.description.max,
        `Description must be at most ${siteSubmissionLimits.description.max} characters`,
      ),
    entryDifficulty: z.enum(["easy", "moderate", "hard"]),
    depthMinM: optionalDepth,
    depthMaxM: optionalDepth,
    hazards: z.string().optional(),
    bestSeason: z
      .string()
      .max(
        siteSubmissionLimits.bestSeason.max,
        `Best season must be at most ${siteSubmissionLimits.bestSeason.max} characters`,
      )
      .optional(),
    typicalConditions: z
      .string()
      .max(
        siteSubmissionLimits.typicalConditions.max,
        `Typical conditions must be at most ${siteSubmissionLimits.typicalConditions.max} characters`,
      )
      .optional(),
    access: z
      .string()
      .max(
        siteSubmissionLimits.access.max,
        `Access must be at most ${siteSubmissionLimits.access.max} characters`,
      )
      .optional(),
    fees: z
      .string()
      .max(
        siteSubmissionLimits.fees.max,
        `Fees must be at most ${siteSubmissionLimits.fees.max} characters`,
      )
      .optional(),
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
  )
  .refine(
    (data) =>
      hazardItems(data.hazards).every(
        (hazard) => hazard.length <= siteSubmissionLimits.hazard.max,
      ),
    {
      message: `Each hazard must be at most ${siteSubmissionLimits.hazard.max} characters`,
      path: ["hazards"],
    },
  );

export type SiteSubmissionValues = z.infer<typeof siteSubmissionSchema>;

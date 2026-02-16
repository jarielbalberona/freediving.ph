import { z } from "zod";

export const MarketplaceCreateSchema = z.object({
  item: z.string().trim().min(2).max(160),
  condition: z.string().trim().min(2).max(50),
  price: z.string().trim().min(1).max(40),
  region: z.string().trim().min(2).max(100),
  description: z.string().trim().max(2000).optional(),
  photos: z.array(z.string().url()).max(10).optional(),
});

export const MarketplaceQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  region: z.string().trim().max(100).optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export const MarketplaceModerateSchema = z.object({
  state: z.enum(["ACTIVE", "FLAGGED", "REMOVED"]),
});

export type MarketplaceCreateSchemaType = z.infer<typeof MarketplaceCreateSchema>;
export type MarketplaceQuerySchemaType = z.infer<typeof MarketplaceQuerySchema>;
export type MarketplaceModerateSchemaType = z.infer<typeof MarketplaceModerateSchema>;

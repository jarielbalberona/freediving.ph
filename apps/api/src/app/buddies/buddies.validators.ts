import { z } from "zod";
import { PaginationQuerySchema } from "@/validators/pagination.schema";

export const SendBuddyRequestSchema = z.object({
  toUserId: z.number().int().positive(),
});

export const RejectBuddyRequestSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

export const BuddyFinderQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  experienceLevel: z.string().trim().max(80).optional(),
  location: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export const BuddyListQuerySchema = PaginationQuerySchema;

export type SendBuddyRequestSchemaType = z.infer<typeof SendBuddyRequestSchema>;
export type RejectBuddyRequestSchemaType = z.infer<typeof RejectBuddyRequestSchema>;
export type BuddyFinderQuerySchemaType = z.infer<typeof BuddyFinderQuerySchema>;
export type BuddyListQuerySchemaType = z.infer<typeof BuddyListQuerySchema>;

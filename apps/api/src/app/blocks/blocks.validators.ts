import { z } from "zod";

export const BlockCreateSchema = z.object({
  blockedUserId: z.number().int().positive(),
  scope: z.enum(["PLATFORM", "MESSAGING_ONLY"]).default("PLATFORM"),
});

export const BlockDeleteSchema = z.object({
  scope: z.enum(["PLATFORM", "MESSAGING_ONLY"]).default("PLATFORM"),
});

export type BlockCreateSchemaType = z.infer<typeof BlockCreateSchema>;
export type BlockDeleteSchemaType = z.infer<typeof BlockDeleteSchema>;

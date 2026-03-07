import { z } from "zod";

export const PaginationQuerySchema = z.object({
	limit: z.coerce.number().int().positive().max(100).default(20),
	offset: z.coerce.number().int().nonnegative().default(0)
});

export type PaginationQuerySchemaType = z.infer<typeof PaginationQuerySchema>;

import { z } from "zod";

export const createThreadModalSchema = z.object({
  title: z.string().min(1, "Title is required").max(200).trim(),
  content: z.string().max(2000).optional(),
  categoryId: z.string().min(1, "Category is required"),
});

export const createThreadPageSchema = createThreadModalSchema.extend({
  content: z.string().min(1, "Content is required").max(2000).trim(),
});

export type CreateThreadModalValues = z.infer<typeof createThreadModalSchema>;
export type CreateThreadPageValues = z.infer<typeof createThreadPageSchema>;

import { z } from "zod";

export const CreateDirectConversationSchema = z.object({
  participantId: z.number().int().positive(),
});

export const ConversationMessagesQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(30),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export const SendMessageSchema = z.object({
  content: z.string().trim().min(1).max(5000),
  type: z.enum(["TEXT", "IMAGE", "VIDEO", "AUDIO", "FILE", "LOCATION"]).default("TEXT"),
});

export const ModerateRemoveMessageSchema = z.object({
  reasonCode: z.enum(["SPAM", "HARASSMENT", "HATE", "MISINFORMATION", "SCAM", "SAFETY", "OTHER"]),
  note: z.string().trim().max(500).optional(),
});

export type CreateDirectConversationSchemaType = z.infer<typeof CreateDirectConversationSchema>;
export type ConversationMessagesQuerySchemaType = z.infer<typeof ConversationMessagesQuerySchema>;
export type SendMessageSchemaType = z.infer<typeof SendMessageSchema>;
export type ModerateRemoveMessageSchemaType = z.infer<typeof ModerateRemoveMessageSchema>;

import { fphgoFetchClient } from "@/lib/api/fphgo-fetch";
import { routes } from "@/lib/api/fphgo-routes";

import type {
  ConversationMessage,
  ConversationMessagesFilters,
  CreateDirectConversationPayload,
  MessageConversationSummary,
  ModerateRemoveMessagePayload,
  SendMessagePayload,
} from '@freediving.ph/types';

export const messagesApi = {
  getConversations: async (): Promise<MessageConversationSummary[]> => {
    const response = await fphgoFetchClient<{ items?: Array<{
      conversationId: string;
      messageId: number;
      senderId: string;
      content: string;
      status: string;
      createdAt: string;
    }> }>(routes.v1.messages.inbox());
    const items = response.items ?? [];
    const byConversation = new Map<string, MessageConversationSummary>();

    for (const item of items) {
      const key = item.conversationId;
      const previous = byConversation.get(key);
      const conversationIdNumber = Number.parseInt(item.conversationId, 10);
      const senderIdNumber = Number.parseInt(item.senderId, 10);
      const lastMessage = {
        id: item.messageId,
        content: item.content,
        createdAt: item.createdAt,
        senderId: Number.isInteger(senderIdNumber) ? senderIdNumber : 0,
        senderName: null,
      };
      if (!previous) {
        byConversation.set(key, {
          conversationId: Number.isInteger(conversationIdNumber)
            ? conversationIdNumber
            : item.messageId,
          type: "DIRECT",
          participants: [],
          lastMessage,
          unreadCount: item.status === "pending" ? 1 : 0,
        });
        continue;
      }
      if (new Date(item.createdAt).getTime() >= new Date(previous.lastMessage?.createdAt || 0).getTime()) {
        previous.lastMessage = lastMessage;
      }
      if (item.status === "pending") {
        previous.unreadCount += 1;
      }
    }

    return Array.from(byConversation.values());
  },

  createOrGetDirectConversation: async (
    _payload: CreateDirectConversationPayload,
  ): Promise<MessageConversationSummary | null> => {
    return null;
  },

  getMessages: async (
    conversationId: number,
    filters?: ConversationMessagesFilters,
  ): Promise<ConversationMessage[]> => {
    const response = await fphgoFetchClient<{ items?: Array<{
      conversationId: string;
      messageId: number;
      senderId: string;
      content: string;
      status: string;
      createdAt: string;
    }> }>(routes.v1.messages.inbox());

    const normalizedConversationId = String(conversationId);
    const all = response.items ?? [];
    const filtered = all
      .filter((item) => item.conversationId === normalizedConversationId)
      .slice(filters?.offset ?? 0, (filters?.offset ?? 0) + (filters?.limit ?? 50));

    return filtered.map((item) => {
      const senderIdNumber = Number.parseInt(item.senderId, 10);
      return {
        id: item.messageId,
        conversationId,
        senderId: Number.isInteger(senderIdNumber) ? senderIdNumber : 0,
        senderName: null,
        senderAlias: null,
        senderImage: null,
        content: item.content,
        type: "TEXT",
        status: "SENT",
        createdAt: item.createdAt,
        updatedAt: item.createdAt,
      };
    });
  },

  sendMessage: async (conversationId: number, payload: SendMessagePayload): Promise<ConversationMessage> => {
    await fphgoFetchClient<{
      conversationId: string;
      status: string;
    }>(routes.v1.messages.send(), {
      method: "POST",
      body: {
        recipientId: String(conversationId),
        content: payload.content,
      },
    });
    return {
      id: Date.now(),
      conversationId,
      senderId: 0,
      senderName: null,
      senderAlias: null,
      senderImage: null,
      content: payload.content,
      type: "TEXT",
      status: "SENT",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },

  deleteOwnMessage: async (_conversationId: number, _messageId: number): Promise<ConversationMessage> => {
    throw new Error("Deleting direct messages is not supported by the current FPHGO API");
  },

  moderateRemoveMessage: async (
    _conversationId: number,
    _messageId: number,
    _payload: ModerateRemoveMessagePayload,
  ): Promise<ConversationMessage> => {
    throw new Error("Moderation remove for direct messages is not supported by the current FPHGO API");
  },
};

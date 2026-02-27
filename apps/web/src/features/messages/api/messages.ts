import {
  type ConversationListResponse,
  type ConversationMessagesResponse,
  type MarkReadRequest,
  type MarkReadResponse,
  type MessageRequestActionResponse,
  type SendMessageRequest,
  type SendMessageResponse,
} from "@freediving.ph/types";

import { fphgoFetchClient } from "@/lib/api/fphgo-fetch-client";
import { routes } from "@/lib/api/fphgo-routes";

export const messagesApi = {
  getInbox: async (limit = 20, cursor?: string): Promise<ConversationListResponse> => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set("cursor", cursor);
    return fphgoFetchClient<ConversationListResponse>(`${routes.v1.messages.inbox()}?${params.toString()}`);
  },

  createRequest: async (recipientId: string, content: string): Promise<MessageRequestActionResponse> => {
    return fphgoFetchClient<MessageRequestActionResponse>(routes.v1.messages.createRequest(), {
      method: "POST",
      body: { recipientId, content },
    });
  },

  acceptRequest: async (requestId: string): Promise<MessageRequestActionResponse> => {
    return fphgoFetchClient<MessageRequestActionResponse>(routes.v1.messages.requestAccept(requestId), {
      method: "POST",
    });
  },

  declineRequest: async (requestId: string): Promise<MessageRequestActionResponse> => {
    return fphgoFetchClient<MessageRequestActionResponse>(routes.v1.messages.requestDecline(requestId), {
      method: "POST",
    });
  },

  getConversationMessages: async (
    conversationId: string,
    limit = 50,
    cursor?: string,
  ): Promise<ConversationMessagesResponse> => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set("cursor", cursor);
    return fphgoFetchClient<ConversationMessagesResponse>(
      `${routes.v1.messages.conversationById(conversationId)}?${params.toString()}`,
    );
  },

  sendConversationMessage: async (conversationId: string, payload: SendMessageRequest): Promise<SendMessageResponse> => {
    return fphgoFetchClient<SendMessageResponse>(routes.v1.messages.conversationById(conversationId), {
      method: "POST",
      body: payload as unknown as Record<string, unknown>,
    });
  },

  markRead: async (payload: MarkReadRequest): Promise<MarkReadResponse> => {
    return fphgoFetchClient<MarkReadResponse>(routes.v1.messages.read(), {
      method: "POST",
      body: payload as unknown as Record<string, unknown>,
    });
  },
};

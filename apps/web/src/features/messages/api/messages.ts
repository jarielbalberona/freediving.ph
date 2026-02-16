import type { ApiEnvelope } from "@freediving.ph/types";

import { axiosInstance } from "@/lib/http/axios";

import type {
  ConversationMessage,
  ConversationMessagesFilters,
  CreateDirectConversationPayload,
  MessageConversationSummary,
  SendMessagePayload,
} from '@freediving.ph/types';

export const messagesApi = {
  getConversations: async (): Promise<MessageConversationSummary[]> => {
    const response = await axiosInstance.get<ApiEnvelope<MessageConversationSummary[]>>("/messages/conversations");
    return response.data.data;
  },

  createOrGetDirectConversation: async (
    payload: CreateDirectConversationPayload,
  ): Promise<MessageConversationSummary | null> => {
    const response = await axiosInstance.post<ApiEnvelope<MessageConversationSummary | null>>(
      "/messages/conversations/direct",
      payload,
    );
    return response.data.data;
  },

  getMessages: async (
    conversationId: number,
    filters?: ConversationMessagesFilters,
  ): Promise<ConversationMessage[]> => {
    const response = await axiosInstance.get<ApiEnvelope<ConversationMessage[]>>(
      `/messages/conversations/${conversationId}/messages`,
      { params: filters },
    );
    return response.data.data;
  },

  sendMessage: async (conversationId: number, payload: SendMessagePayload): Promise<ConversationMessage> => {
    const response = await axiosInstance.post<ApiEnvelope<ConversationMessage>>(
      `/messages/conversations/${conversationId}/messages`,
      payload,
    );
    return response.data.data;
  },
};

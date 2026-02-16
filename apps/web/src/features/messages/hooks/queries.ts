import { useQuery } from "@tanstack/react-query";

import { messagesApi } from "../api/messages";
import type { ConversationMessagesFilters } from '@freediving.ph/types';

export const useMessageConversations = () => {
  return useQuery({
    queryKey: ["messages", "conversations"],
    queryFn: () => messagesApi.getConversations(),
    staleTime: 60_000,
  });
};

export const useConversationMessages = (conversationId: number | null, filters?: ConversationMessagesFilters) => {
  return useQuery({
    queryKey: ["messages", "conversation", conversationId, filters],
    queryFn: () => messagesApi.getMessages(Number(conversationId), filters),
    enabled: conversationId !== null,
    staleTime: 15_000,
  });
};

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { ConversationMessagesResponse, MessageMetadata, SendMessageResponse } from "@freediving.ph/types";
import { messagesApi } from "../api/messages";

export const useCreateMessageRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ recipientId, content }: { recipientId: string; content: string }) =>
      messagesApi.createRequest(recipientId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", "inbox"] });
    },
  });
};

export const useAcceptMessageRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) => messagesApi.acceptRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", "inbox"] });
    },
  });
};

export const useDeclineMessageRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) => messagesApi.declineRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", "inbox"] });
    },
  });
};

export const useSendMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, content, metadata }: { conversationId: string; content: string; metadata?: MessageMetadata }) =>
      messagesApi.sendConversationMessage(conversationId, { content, metadata }),
    onSuccess: (data: SendMessageResponse, variables) => {
      queryClient.setQueryData<ConversationMessagesResponse | undefined>(
        ["messages", "conversation", variables.conversationId],
        (current) => {
          if (!current) return current;
          const exists = current.items.some((m) => m.messageId === data.message.messageId);
          if (exists) return current;
          return { ...current, items: [data.message, ...current.items] };
        },
      );
    },
  });
};

export const useMarkConversationRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, messageId }: { conversationId: string; messageId?: string }) =>
      messagesApi.markRead({ conversationId, messageId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", "inbox"] });
    },
  });
};

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { messagesApi } from "../api/messages";
import type { SendMessagePayload } from '@freediving.ph/types';

export const useSendMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ conversationId, payload }: { conversationId: number; payload: SendMessagePayload }) =>
      messagesApi.sendMessage(conversationId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["messages", "conversations"] });
      queryClient.invalidateQueries({ queryKey: ["messages", "conversation", variables.conversationId] });
    },
  });
};

export const useDeleteOwnMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ conversationId, messageId }: { conversationId: number; messageId: number }) =>
      messagesApi.deleteOwnMessage(conversationId, messageId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["messages", "conversations"] });
      queryClient.invalidateQueries({ queryKey: ["messages", "conversation", variables.conversationId] });
    },
  });
};

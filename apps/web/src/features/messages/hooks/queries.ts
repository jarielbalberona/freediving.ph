import { useQuery } from "@tanstack/react-query";

import { messagesApi } from "../api/messages";

export const useMessageInbox = () => {
  return useQuery({
    queryKey: ["messages", "inbox"],
    queryFn: () => messagesApi.getInbox(50),
    staleTime: 30_000,
  });
};

export const useConversationMessages = (conversationId: string | null) => {
  return useQuery({
    queryKey: ["messages", "conversation", conversationId],
    queryFn: () => messagesApi.getConversationMessages(conversationId as string, 50),
    enabled: !!conversationId,
    staleTime: 10_000,
  });
};

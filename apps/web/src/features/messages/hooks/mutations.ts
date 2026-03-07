import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  MessagingMarkReadResponse,
  MessagingSendMessageResponse,
  MessagingThreadMessage,
  MessagingThreadMessagesResponse,
  MessagingThreadSummary,
} from "@freediving.ph/types";

import { messagesApi } from "../api/messages";
import { messageQueryKeys } from "./queries";

const threadMessageFromPending = (params: {
  threadId: string;
  body: string;
  clientId: string;
  actorId?: string;
}): MessagingThreadMessage => ({
  id: `pending:${params.clientId}`,
  threadId: params.threadId,
  senderUserId: params.actorId || "",
  kind: "text",
  body: params.body,
  createdAt: new Date().toISOString(),
  clientId: params.clientId,
  isOwn: true,
  status: "pending",
});

export const useOpenDirectThread = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (targetUserId: string) => messagesApi.openDirectThread({ targetUserId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", "threads"] });
    },
  });
};

export const useSendThreadMessage = (actorId?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ threadId, body, clientId }: { threadId: string; body: string; clientId: string }) =>
      messagesApi.sendThreadMessage(threadId, { body, clientId }),
    onMutate: async ({ threadId, body, clientId }) => {
      const optimistic = threadMessageFromPending({ threadId, body, clientId, actorId });
      const key = messageQueryKeys.threadMessages(threadId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData(key);

      queryClient.setQueryData(key, (current: { pages: MessagingThreadMessagesResponse[]; pageParams: string[] } | undefined) => {
        if (!current || current.pages.length === 0) {
          return {
            pages: [{ items: [optimistic] }],
            pageParams: [""],
          };
        }
        const [firstPage, ...rest] = current.pages;
        return {
          ...current,
          pages: [{ ...firstPage, items: [...firstPage.items, optimistic] }, ...rest],
        };
      });

      return { previous, key, clientId, threadId };
    },
    onError: (_error, _variables, context) => {
      if (!context) return;
      queryClient.setQueryData(context.key, context.previous);
    },
    onSuccess: (data: MessagingSendMessageResponse, _variables, context) => {
      if (!context) return;
      queryClient.setQueryData(context.key, (current: { pages: MessagingThreadMessagesResponse[]; pageParams: string[] } | undefined) => {
        if (!current) return current;
        const pages = current.pages.map((page, pageIndex) => {
          if (pageIndex !== 0) return page;
          const withoutPending = page.items.filter((message) => message.clientId !== context.clientId && message.id !== `pending:${context.clientId}`);
          if (withoutPending.some((message) => message.id === data.message.id)) {
            return { ...page, items: withoutPending };
          }
          return { ...page, items: [...withoutPending, data.message] };
        });
        return { ...current, pages };
      });

      queryClient.setQueriesData({ queryKey: ["messages", "threads"] }, (current: { pages: { items: MessagingThreadSummary[] }[] } | undefined) => {
        if (!current) return current;
        const pages = current.pages.map((page) => ({
          ...page,
          items: page.items.map((item) =>
            item.id === context.threadId
              ? {
                  ...item,
                  lastMessage: data.message,
                  lastMessageAt: data.message.createdAt,
                }
              : item,
          ),
        }));
        return { ...current, pages };
      });

      queryClient.invalidateQueries({ queryKey: ["messages", "threads"] });
    },
  });
};

export const useMarkThreadRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ threadId, lastReadMessageId }: { threadId: string; lastReadMessageId: string }) =>
      messagesApi.markThreadRead(threadId, { lastReadMessageId }),
    onSuccess: (data: MessagingMarkReadResponse, variables: { threadId: string; lastReadMessageId: string }) => {
      queryClient.setQueriesData({ queryKey: ["messages", "threads"] }, (current: { pages: { items: MessagingThreadSummary[] }[] } | undefined) => {
        if (!current) return current;
        const pages = current.pages.map((page) => ({
          ...page,
          items: page.items.map((item) =>
            item.id === data.threadId
              ? {
                  ...item,
                  unreadCount: 0,
                  hasUnread: false,
                }
              : item,
          ),
        }));
        return { ...current, pages };
      });

      queryClient.setQueryData(messageQueryKeys.thread(data.threadId), (current: { lastReadMessageId?: string } | undefined) => {
        if (!current) return current;
        return {
          ...current,
          lastReadMessageId: variables.lastReadMessageId,
        };
      });
    },
  });
};

export const useUpdateThreadCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ threadId, category }: { threadId: string; category: "primary" | "transactions" }) =>
      messagesApi.updateThreadCategory(threadId, { category }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", "threads"] });
    },
  });
};

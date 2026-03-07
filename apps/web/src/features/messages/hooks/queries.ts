import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import type { MessagingThreadCategory } from "@freediving.ph/types";

import { messagesApi } from "../api/messages";

export const messageQueryKeys = {
  all: ["messages"] as const,
  threads: (category: MessagingThreadCategory, q: string) => ["messages", "threads", category, q] as const,
  thread: (threadId: string) => ["messages", "thread", threadId] as const,
  threadMessages: (threadId: string) => ["messages", "thread", threadId, "messages"] as const,
};

export const useThreadList = (
  category: MessagingThreadCategory,
  q: string,
  enabled = true,
) => {
  return useInfiniteQuery({
    queryKey: messageQueryKeys.threads(category, q),
    queryFn: ({ pageParam }) =>
      messagesApi.listThreads({
        category,
        q,
        cursor: pageParam,
        limit: 20,
      }),
    initialPageParam: "",
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
    enabled,
  });
};

export const useThreadDetail = (threadId: string | null, enabled = true) => {
  return useQuery({
    queryKey: threadId ? messageQueryKeys.thread(threadId) : ["messages", "thread", "empty"],
    queryFn: () => messagesApi.getThread(threadId as string),
    enabled: enabled && Boolean(threadId),
    staleTime: 20_000,
  });
};

export const useThreadMessages = (threadId: string | null, enabled = true) => {
  return useInfiniteQuery({
    queryKey: threadId ? messageQueryKeys.threadMessages(threadId) : ["messages", "thread", "empty", "messages"],
    queryFn: ({ pageParam }) => messagesApi.listThreadMessages(threadId as string, 30, pageParam),
    initialPageParam: "",
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
    enabled: enabled && Boolean(threadId),
  });
};

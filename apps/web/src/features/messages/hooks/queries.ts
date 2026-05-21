import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import type { MessagingThreadCategory } from "@freediving.ph/types";

import { queryKeys } from "@/lib/query/query-keys";

import { messagesApi } from "../api/messages";
import { currentMessagePerfTime, logMessagingPerf } from "../lib/perf";

export const messageQueryKeys = queryKeys.messages;

export const useThreadList = (
  category: MessagingThreadCategory,
  q: string,
  enabled = true,
) => {
  return useInfiniteQuery({
    queryKey: messageQueryKeys.threadList(category, q),
    queryFn: async ({ pageParam }) => {
      const startedAt = currentMessagePerfTime();
      logMessagingPerf("thread_list_query_start", {
        category,
        hasSearch: Boolean(q),
      });
      try {
        return await messagesApi.listThreads({
          category,
          q,
          cursor: pageParam,
          limit: 20,
        });
      } finally {
        logMessagingPerf("thread_list_query_end", {
          category,
          durationMs: Math.round(currentMessagePerfTime() - startedAt),
          hasSearch: Boolean(q),
        });
      }
    },
    initialPageParam: "",
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
    enabled,
  });
};

export const useThreadDetail = (threadId: string | null, enabled = true) => {
  return useQuery({
    queryKey: threadId
      ? messageQueryKeys.thread(threadId)
      : messageQueryKeys.emptyThread(),
    queryFn: async () => {
      const currentThreadId = threadId as string;
      const startedAt = currentMessagePerfTime();
      logMessagingPerf("thread_detail_query_start", {
        threadId: currentThreadId,
      });
      try {
        return await messagesApi.getThread(currentThreadId);
      } finally {
        logMessagingPerf("thread_detail_query_end", {
          threadId: currentThreadId,
          durationMs: Math.round(currentMessagePerfTime() - startedAt),
        });
      }
    },
    enabled: enabled && Boolean(threadId),
    staleTime: 20_000,
  });
};

export const useThreadMessages = (threadId: string | null, enabled = true) => {
  return useInfiniteQuery({
    queryKey: threadId
      ? messageQueryKeys.threadMessages(threadId)
      : messageQueryKeys.emptyThreadMessages(),
    queryFn: async ({ pageParam }) => {
      const currentThreadId = threadId as string;
      const startedAt = currentMessagePerfTime();
      logMessagingPerf("thread_messages_query_start", {
        threadId: currentThreadId,
      });
      try {
        return await messagesApi.listThreadMessages(
          currentThreadId,
          30,
          pageParam,
        );
      } finally {
        logMessagingPerf("thread_messages_query_end", {
          threadId: currentThreadId,
          durationMs: Math.round(currentMessagePerfTime() - startedAt),
        });
      }
    },
    initialPageParam: "",
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
    enabled: enabled && Boolean(threadId),
  });
};

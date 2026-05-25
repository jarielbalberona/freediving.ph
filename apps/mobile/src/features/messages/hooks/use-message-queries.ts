import type { MessagingThreadCategory } from "@freediving.ph/types";

import {
  getMessageThread,
  listMessageThreads,
  listThreadMessages,
} from "@/features/messages/api/messages-api";
import { useAuthenticatedFphgoQuery } from "@/lib/query";
import { mobileQueryKeys } from "@/lib/query";

export const useMessageThreadsQuery = (category: MessagingThreadCategory) =>
  useAuthenticatedFphgoQuery({
    queryFn: (_context, authToken) => listMessageThreads(category, authToken),
    queryKey: mobileQueryKeys.messages.threads(category),
    staleTime: 30 * 1000,
  });

export const useMessageThreadQuery = (threadId: string | undefined) =>
  useAuthenticatedFphgoQuery({
    enabled: Boolean(threadId),
    queryFn: (_context, authToken) => getMessageThread(threadId ?? "", authToken),
    queryKey: mobileQueryKeys.messages.detail(threadId ?? ""),
    staleTime: 30 * 1000,
  });

export const useThreadMessagesQuery = (threadId: string | undefined) =>
  useAuthenticatedFphgoQuery({
    enabled: Boolean(threadId),
    queryFn: (_context, authToken) => listThreadMessages(threadId ?? "", authToken),
    queryKey: mobileQueryKeys.messages.messages(threadId ?? ""),
    staleTime: 15 * 1000,
  });

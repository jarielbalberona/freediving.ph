import type {
  MessagingMarkReadRequest,
  MessagingMarkReadResponse,
  MessagingOpenDirectThreadRequest,
  MessagingResolveThreadRequestResponse,
  MessagingSendMessageRequest,
  MessagingSendMessageResponse,
  MessagingThreadDetailResponse,
  MessagingThreadListResponse,
  MessagingThreadMessagesResponse,
  MessagingUnreadCountResponse,
  MessagingUpdateThreadCategoryRequest,
  MessagingUpdateThreadCategoryResponse,
} from "@freediving.ph/types";

import { fphgoFetchClient } from "@/lib/api/fphgo-fetch-client";
import { routes } from "@/lib/api/fphgo-routes";

export type ListThreadsParams = {
  category: "primary" | "transactions" | "requests";
  limit?: number;
  cursor?: string;
  q?: string;
};

export const messagesApi = {
  getUnreadCount: async (): Promise<MessagingUnreadCountResponse> => {
    return fphgoFetchClient<MessagingUnreadCountResponse>(
      routes.v1.messages.unreadCount(),
      { perfLabel: "messages.unread_count" },
    );
  },

  listThreads: async ({
    category,
    limit = 20,
    cursor,
    q,
  }: ListThreadsParams): Promise<MessagingThreadListResponse> => {
    const params = new URLSearchParams({ category, limit: String(limit) });
    if (cursor) params.set("cursor", cursor);
    if (q && q.trim()) params.set("q", q.trim());
    return fphgoFetchClient<MessagingThreadListResponse>(
      `${routes.v1.messages.threads()}?${params.toString()}`,
      { perfLabel: "messages.thread_list" },
    );
  },

  getThread: async (
    threadId: string,
  ): Promise<MessagingThreadDetailResponse> => {
    return fphgoFetchClient<MessagingThreadDetailResponse>(
      routes.v1.messages.threadById(threadId),
      { perfLabel: "messages.thread_detail" },
    );
  },

  listThreadMessages: async (
    threadId: string,
    limit = 30,
    cursor?: string,
  ): Promise<MessagingThreadMessagesResponse> => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set("cursor", cursor);
    return fphgoFetchClient<MessagingThreadMessagesResponse>(
      `${routes.v1.messages.threadMessages(threadId)}?${params.toString()}`,
      { perfLabel: "messages.thread_messages" },
    );
  },

  openDirectThread: async (
    payload: MessagingOpenDirectThreadRequest,
  ): Promise<MessagingThreadDetailResponse> => {
    return fphgoFetchClient<MessagingThreadDetailResponse>(
      routes.v1.messages.directThread(),
      {
        method: "POST",
        body: payload as unknown as Record<string, unknown>,
        perfLabel: "messages.direct_thread",
      },
    );
  },

  sendThreadMessage: async (
    threadId: string,
    payload: MessagingSendMessageRequest,
  ): Promise<MessagingSendMessageResponse> => {
    return fphgoFetchClient<MessagingSendMessageResponse>(
      routes.v1.messages.threadMessages(threadId),
      {
        method: "POST",
        body: payload as unknown as Record<string, unknown>,
        perfLabel: "messages.send_thread_message",
      },
    );
  },

  markThreadRead: async (
    threadId: string,
    payload: MessagingMarkReadRequest,
  ): Promise<MessagingMarkReadResponse> => {
    return fphgoFetchClient<MessagingMarkReadResponse>(
      routes.v1.messages.threadRead(threadId),
      {
        method: "POST",
        body: payload as unknown as Record<string, unknown>,
        perfLabel: "messages.mark_thread_read",
      },
    );
  },

  acceptThreadRequest: async (
    threadId: string,
  ): Promise<MessagingResolveThreadRequestResponse> => {
    return fphgoFetchClient<MessagingResolveThreadRequestResponse>(
      routes.v1.messages.threadAccept(threadId),
      {
        method: "POST",
        perfLabel: "messages.accept_thread_request",
      },
    );
  },

  declineThreadRequest: async (
    threadId: string,
  ): Promise<MessagingResolveThreadRequestResponse> => {
    return fphgoFetchClient<MessagingResolveThreadRequestResponse>(
      routes.v1.messages.threadDecline(threadId),
      {
        method: "POST",
        perfLabel: "messages.decline_thread_request",
      },
    );
  },

  updateThreadCategory: async (
    threadId: string,
    payload: MessagingUpdateThreadCategoryRequest,
  ): Promise<MessagingUpdateThreadCategoryResponse> => {
    return fphgoFetchClient<MessagingUpdateThreadCategoryResponse>(
      routes.v1.messages.threadCategory(threadId),
      {
        method: "POST",
        body: payload as unknown as Record<string, unknown>,
        perfLabel: "messages.update_thread_category",
      },
    );
  },
};

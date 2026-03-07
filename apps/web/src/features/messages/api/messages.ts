import type {
  MessagingMarkReadRequest,
  MessagingMarkReadResponse,
  MessagingOpenDirectThreadRequest,
  MessagingSendMessageRequest,
  MessagingSendMessageResponse,
  MessagingThreadDetailResponse,
  MessagingThreadListResponse,
  MessagingThreadMessagesResponse,
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
  listThreads: async ({ category, limit = 20, cursor, q }: ListThreadsParams): Promise<MessagingThreadListResponse> => {
    const params = new URLSearchParams({ category, limit: String(limit) });
    if (cursor) params.set("cursor", cursor);
    if (q && q.trim()) params.set("q", q.trim());
    return fphgoFetchClient<MessagingThreadListResponse>(`${routes.v1.messages.threads()}?${params.toString()}`);
  },

  getThread: async (threadId: string): Promise<MessagingThreadDetailResponse> => {
    return fphgoFetchClient<MessagingThreadDetailResponse>(routes.v1.messages.threadById(threadId));
  },

  listThreadMessages: async (threadId: string, limit = 30, cursor?: string): Promise<MessagingThreadMessagesResponse> => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set("cursor", cursor);
    return fphgoFetchClient<MessagingThreadMessagesResponse>(`${routes.v1.messages.threadMessages(threadId)}?${params.toString()}`);
  },

  openDirectThread: async (payload: MessagingOpenDirectThreadRequest): Promise<MessagingThreadDetailResponse> => {
    return fphgoFetchClient<MessagingThreadDetailResponse>(routes.v1.messages.directThread(), {
      method: "POST",
      body: payload as unknown as Record<string, unknown>,
    });
  },

  sendThreadMessage: async (threadId: string, payload: MessagingSendMessageRequest): Promise<MessagingSendMessageResponse> => {
    return fphgoFetchClient<MessagingSendMessageResponse>(routes.v1.messages.threadMessages(threadId), {
      method: "POST",
      body: payload as unknown as Record<string, unknown>,
    });
  },

  markThreadRead: async (threadId: string, payload: MessagingMarkReadRequest): Promise<MessagingMarkReadResponse> => {
    return fphgoFetchClient<MessagingMarkReadResponse>(routes.v1.messages.threadRead(threadId), {
      method: "POST",
      body: payload as unknown as Record<string, unknown>,
    });
  },

  updateThreadCategory: async (threadId: string, payload: MessagingUpdateThreadCategoryRequest): Promise<MessagingUpdateThreadCategoryResponse> => {
    return fphgoFetchClient<MessagingUpdateThreadCategoryResponse>(routes.v1.messages.threadCategory(threadId), {
      method: "POST",
      body: payload as unknown as Record<string, unknown>,
    });
  },
};

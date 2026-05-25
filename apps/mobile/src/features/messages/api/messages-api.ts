import type {
  MessagingMarkReadResponse,
  MessagingResolveThreadRequestResponse,
  MessagingSendMessageResponse,
  MessagingThreadCategory,
  MessagingThreadDetailResponse,
  MessagingThreadListResponse,
  MessagingThreadMessagesResponse,
} from "@freediving.ph/types";

import { fphgoFetch } from "@/lib/api";

const withQuery = (
  path: string,
  params: Record<string, string | number | undefined>,
) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `${path}?${query}` : path;
};

export const listMessageThreads = (
  category: MessagingThreadCategory,
  authToken: string,
) =>
  fphgoFetch<MessagingThreadListResponse>(
    withQuery("/v1/messages/threads", { category, limit: 30 }),
    { auth: "required", authToken },
  );

export const getMessageThread = (threadId: string, authToken: string) =>
  fphgoFetch<MessagingThreadDetailResponse>(
    `/v1/messages/threads/${encodeURIComponent(threadId)}`,
    { auth: "required", authToken },
  );

export const listThreadMessages = (threadId: string, authToken: string) =>
  fphgoFetch<MessagingThreadMessagesResponse>(
    withQuery(`/v1/messages/threads/${encodeURIComponent(threadId)}/messages`, {
      limit: 50,
    }),
    { auth: "required", authToken },
  );

export const sendThreadMessage = (
  threadId: string,
  payload: { body: string; clientId: string },
  authToken: string,
) =>
  fphgoFetch<MessagingSendMessageResponse>(
    `/v1/messages/threads/${encodeURIComponent(threadId)}/messages`,
    {
      auth: "required",
      authToken,
      body: payload,
      method: "POST",
    },
  );

export const acceptThreadRequest = (threadId: string, authToken: string) =>
  fphgoFetch<MessagingResolveThreadRequestResponse>(
    `/v1/messages/threads/${encodeURIComponent(threadId)}/accept`,
    { auth: "required", authToken, method: "POST" },
  );

export const declineThreadRequest = (threadId: string, authToken: string) =>
  fphgoFetch<MessagingResolveThreadRequestResponse>(
    `/v1/messages/threads/${encodeURIComponent(threadId)}/decline`,
    { auth: "required", authToken, method: "POST" },
  );

export const markThreadRead = (
  threadId: string,
  lastReadMessageId: string,
  authToken: string,
) =>
  fphgoFetch<MessagingMarkReadResponse>(
    `/v1/messages/threads/${encodeURIComponent(threadId)}/read`,
    {
      auth: "required",
      authToken,
      body: { lastReadMessageId },
      method: "POST",
    },
  );

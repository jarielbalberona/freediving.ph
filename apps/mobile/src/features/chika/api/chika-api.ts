import type {
  ChikaCategoryListResponse,
  ChikaCommentListResponse,
  ChikaCommentReactionResponse,
  ChikaCommentResponse,
  ChikaReactionType,
  ChikaThreadReactionResponse,
  ChikaThreadListResponse,
  ChikaThreadResponse,
  CreateChikaCommentRequest,
  CreateChikaThreadRequest,
  SetChikaReactionRequest,
} from "@freediving.ph/types";

import { fphgoFetch } from "@/lib/api";

const withQuery = (
  path: string,
  params: Record<string, string | number | boolean | undefined>,
) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `${path}?${query}` : path;
};

export const getChikaThreads = (params: { category?: string; limit?: number } = {}) =>
  fphgoFetch<ChikaThreadListResponse>(
    withQuery("/v1/chika/threads", {
      category: params.category,
      limit: params.limit,
    }),
    { auth: "optional" },
  );

export const getChikaThreadDetail = (slug: string) =>
  fphgoFetch<ChikaThreadResponse>(
    `/v1/chika/threads/${encodeURIComponent(slug)}`,
    { auth: "optional" },
  );

export const getChikaComments = (threadId: string, params: { limit?: number } = {}) =>
  fphgoFetch<ChikaCommentListResponse>(
    withQuery(`/v1/chika/threads/${encodeURIComponent(threadId)}/comments`, {
      limit: params.limit,
    }),
    { auth: "optional" },
  );

export const getChikaCategories = () =>
  fphgoFetch<ChikaCategoryListResponse>("/v1/chika/categories", {
    auth: "none",
  });

export const createChikaThread = (
  payload: CreateChikaThreadRequest,
  authToken: string,
) =>
  fphgoFetch<ChikaThreadResponse>("/v1/chika/threads", {
    auth: "required",
    authToken,
    body: payload,
    method: "POST",
  });

export const createChikaComment = (
  threadId: string,
  payload: CreateChikaCommentRequest,
  authToken: string,
) =>
  fphgoFetch<ChikaCommentResponse>(
    `/v1/chika/threads/${encodeURIComponent(threadId)}/comments`,
    {
      auth: "required",
      authToken,
      body: payload,
      method: "POST",
    },
  );

export const setChikaThreadReaction = (
  threadId: string,
  type: ChikaReactionType,
  authToken: string,
  idempotencyKey?: string,
) =>
  fphgoFetch<ChikaThreadReactionResponse>(
    `/v1/chika/threads/${encodeURIComponent(threadId)}/reactions`,
    {
      auth: "required",
      authToken,
      body: { type } satisfies SetChikaReactionRequest,
      idempotencyKey,
      method: "POST",
    },
  );

export const removeChikaThreadReaction = (
  threadId: string,
  authToken: string,
  idempotencyKey?: string,
) =>
  fphgoFetch<void>(
    `/v1/chika/threads/${encodeURIComponent(threadId)}/reactions`,
    {
      auth: "required",
      authToken,
      idempotencyKey,
      method: "DELETE",
    },
  );

export const setChikaCommentReaction = (
  commentId: string,
  type: ChikaReactionType,
  authToken: string,
  idempotencyKey?: string,
) =>
  fphgoFetch<ChikaCommentReactionResponse>(
    `/v1/chika/comments/${encodeURIComponent(commentId)}/reactions`,
    {
      auth: "required",
      authToken,
      body: { type } satisfies SetChikaReactionRequest,
      idempotencyKey,
      method: "POST",
    },
  );

export const removeChikaCommentReaction = (
  commentId: string,
  authToken: string,
  idempotencyKey?: string,
) =>
  fphgoFetch<ChikaCommentReactionResponse>(
    `/v1/chika/comments/${encodeURIComponent(commentId)}/reactions`,
    {
      auth: "required",
      authToken,
      idempotencyKey,
      method: "DELETE",
    },
  );

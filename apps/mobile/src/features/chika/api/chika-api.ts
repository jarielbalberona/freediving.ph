import type {
  ChikaCategoryListResponse,
  ChikaCommentListResponse,
  ChikaCommentReactionResponse,
  ChikaCommentResponse,
  ChikaThreadListResponse,
  ChikaThreadResponse,
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

export const getChikaThreads = (params: { limit?: number } = {}) =>
  fphgoFetch<ChikaThreadListResponse>(
    withQuery("/v1/chika/threads", {
      limit: params.limit,
    }),
    { auth: "none" },
  );

export const getChikaThreadDetail = (slug: string) =>
  fphgoFetch<ChikaThreadResponse>(
    `/v1/chika/threads/${encodeURIComponent(slug)}`,
    { auth: "none" },
  );

export const getChikaComments = (threadId: string, params: { limit?: number } = {}) =>
  fphgoFetch<ChikaCommentListResponse>(
    withQuery(`/v1/chika/threads/${encodeURIComponent(threadId)}/comments`, {
      limit: params.limit,
    }),
    { auth: "none" },
  );

export const getChikaCategories = () =>
  fphgoFetch<ChikaCategoryListResponse>("/v1/chika/categories", {
    auth: "none",
  });

export const createChikaThread = (
  payload: { title: string; content: string; categoryId: string },
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
  payload: { content: string; parentCommentId?: string },
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
  type: "upvote" | "downvote",
  authToken: string,
) =>
  fphgoFetch<void>(
    `/v1/chika/threads/${encodeURIComponent(threadId)}/reactions`,
    {
      auth: "required",
      authToken,
      body: { type },
      method: "POST",
    },
  );

export const removeChikaThreadReaction = (threadId: string, authToken: string) =>
  fphgoFetch<void>(
    `/v1/chika/threads/${encodeURIComponent(threadId)}/reactions`,
    {
      auth: "required",
      authToken,
      method: "DELETE",
    },
  );

export const setChikaCommentReaction = (
  commentId: string,
  type: "upvote" | "downvote",
  authToken: string,
) =>
  fphgoFetch<ChikaCommentReactionResponse>(
    `/v1/chika/comments/${encodeURIComponent(commentId)}/reactions`,
    {
      auth: "required",
      authToken,
      body: { type },
      method: "POST",
    },
  );

export const removeChikaCommentReaction = (
  commentId: string,
  authToken: string,
) =>
  fphgoFetch<ChikaCommentReactionResponse>(
    `/v1/chika/comments/${encodeURIComponent(commentId)}/reactions`,
    {
      auth: "required",
      authToken,
      method: "DELETE",
    },
  );

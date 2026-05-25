import type {
  ChikaCommentListResponse,
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

import type {
  ActivityFeedFilter,
  ActivityFeedResponse,
  FeedActionsRequest,
  MediaPostLikeState,
} from "@freediving.ph/types";

import { fphgoFetch } from "@/lib/api";

const withQuery = (
  path: string,
  params: Record<string, string | number | undefined>,
) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  }
  const query = search.toString();
  return query ? `${path}?${query}` : path;
};

export const getHomeActivityFeed = (params: {
  cursor?: string;
  filter?: ActivityFeedFilter;
  limit?: number;
}) =>
  fphgoFetch<ActivityFeedResponse>(
    withQuery("/v1/feed/activity", {
      cursor: params.cursor,
      filter: params.filter,
      limit: params.limit,
    }),
    { auth: "optional" },
  );

export const postFeedActions = (
  payload: FeedActionsRequest,
  authToken: string,
) =>
  fphgoFetch<void>("/v1/feed/actions", {
    auth: "required",
    authToken,
    body: payload as unknown as Record<string, unknown>,
    method: "POST",
  });

export const likeMediaPost = (postId: string, authToken: string) =>
  fphgoFetch<MediaPostLikeState>(
    `/v1/media/posts/${encodeURIComponent(postId)}/likes`,
    {
      auth: "required",
      authToken,
      method: "POST",
    },
  );

export const unlikeMediaPost = (postId: string, authToken: string) =>
  fphgoFetch<MediaPostLikeState>(
    `/v1/media/posts/${encodeURIComponent(postId)}/likes`,
    {
      auth: "required",
      authToken,
      method: "DELETE",
    },
  );

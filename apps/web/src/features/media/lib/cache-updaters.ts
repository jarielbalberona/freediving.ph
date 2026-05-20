import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/query-keys";

export type MediaPostCachePatch = {
  likeCount?: number;
  viewerHasLiked?: boolean;
  commentCount?: number;
  viewerHasSaved?: boolean;
};

const patchPayload = (
  payload: Record<string, unknown> | undefined,
  patch: MediaPostCachePatch,
) => ({
  ...(payload ?? {}),
  ...patch,
});

const patchActivityStats = (
  stats: Record<string, unknown> | undefined,
  patch: MediaPostCachePatch,
) => ({
  ...(stats ?? {}),
  ...patch,
});

export function updateMediaPostInCaches(
  queryClient: QueryClient,
  postId: string,
  patch: MediaPostCachePatch,
) {
  queryClient.setQueriesData(
    { queryKey: queryKeys.media.profileLists() },
    (current: any) => {
      if (!current?.pages) return current;
      return {
        ...current,
        pages: current.pages.map((page: any) => ({
          ...page,
          items: (page.items ?? []).map((item: any) =>
            item.postId === postId ? { ...item, ...patch } : item,
          ),
        })),
      };
    },
  );

  queryClient.setQueriesData({ queryKey: queryKeys.feed.all }, (current: any) => {
    if (!current?.items) return current;
    return {
      ...current,
      items: current.items.map((item: any) =>
        item.type === "media_post" && item.entityId === postId
          ? { ...item, payload: patchPayload(item.payload, patch) }
          : item,
      ),
    };
  });

  queryClient.setQueriesData(
    { queryKey: queryKeys.feed.activityAll },
    (current: any) => {
      if (!current?.items) return current;
      return {
        ...current,
        items: current.items.map((item: any) =>
          item.type === "media_post_created" && item.sourceId === postId
            ? { ...item, stats: patchActivityStats(item.stats, patch) }
            : item,
        ),
      };
    },
  );

  queryClient.setQueriesData(
    { queryKey: queryKeys.explore.sites() },
    (current: any) => {
      if (!current?.items) return current;
      return {
        ...current,
        items: current.items.map((item: any) =>
          item.type === "media_post_created" && item.sourceId === postId
            ? { ...item, stats: patchActivityStats(item.stats, patch) }
            : item,
        ),
      };
    },
  );

  queryClient.setQueriesData(
    { queryKey: queryKeys.media.postDetail(postId) },
    (current: any) => {
      if (!current?.post?.post) return current;
      return {
        ...current,
        post: {
          ...current.post,
          post: { ...current.post.post, ...patch },
          items: (current.post.items ?? []).map((item: any) => ({
            ...item,
            ...patch,
          })),
        },
      };
    },
  );
}

export function updateMediaPostCommentCountDelta(
  queryClient: QueryClient,
  postId: string,
  delta: number,
) {
  const updateCount = (value: unknown) => Math.max(0, Number(value ?? 0) + delta);

  queryClient.setQueriesData(
    { queryKey: queryKeys.media.profileLists() },
    (current: any) => {
      if (!current?.pages) return current;
      return {
        ...current,
        pages: current.pages.map((page: any) => ({
          ...page,
          items: (page.items ?? []).map((item: any) =>
            item.postId === postId
              ? { ...item, commentCount: updateCount(item.commentCount) }
              : item,
          ),
        })),
      };
    },
  );

  queryClient.setQueriesData({ queryKey: queryKeys.feed.all }, (current: any) => {
    if (!current?.items) return current;
    return {
      ...current,
      items: current.items.map((item: any) =>
        item.type === "media_post" && item.entityId === postId
          ? {
              ...item,
              payload: {
                ...(item.payload ?? {}),
                commentCount: updateCount(item.payload?.commentCount),
              },
            }
          : item,
      ),
    };
  });

  queryClient.setQueriesData(
    { queryKey: queryKeys.feed.activityAll },
    (current: any) => {
      if (!current?.items) return current;
      return {
        ...current,
        items: current.items.map((item: any) =>
          item.type === "media_post_created" && item.sourceId === postId
            ? {
                ...item,
                stats: {
                  ...(item.stats ?? {}),
                  commentCount: updateCount(item.stats?.commentCount),
                },
              }
            : item,
        ),
      };
    },
  );

  queryClient.setQueriesData(
    { queryKey: queryKeys.explore.sites() },
    (current: any) => {
      if (!current?.items) return current;
      return {
        ...current,
        items: current.items.map((item: any) =>
          item.type === "media_post_created" && item.sourceId === postId
            ? {
                ...item,
                stats: {
                  ...(item.stats ?? {}),
                  commentCount: updateCount(item.stats?.commentCount),
                },
              }
            : item,
        ),
      };
    },
  );

  queryClient.setQueriesData(
    { queryKey: queryKeys.media.postDetail(postId) },
    (current: any) => {
      if (!current?.post?.post) return current;
      const commentCount = updateCount(current.post.post.commentCount);
      return {
        ...current,
        post: {
          ...current.post,
          post: { ...current.post.post, commentCount },
          items: (current.post.items ?? []).map((item: any) => ({
            ...item,
            commentCount,
          })),
        },
      };
    },
  );
}

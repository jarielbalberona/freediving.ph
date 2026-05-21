import type { QueryClient } from "@tanstack/react-query";
import type {
  ActivityFeedItem,
  ActivityFeedResponse,
  HomeFeedItem,
  HomeFeedResponse,
  ListProfileMediaResponse,
  MediaPostDetailResponse,
  ProfileMediaItem,
} from "@freediving.ph/types";

import { queryKeys } from "@/lib/query/query-keys";

export type MediaPostCachePatch = {
  likeCount?: number;
  viewerHasLiked?: boolean;
  commentCount?: number;
  viewerHasSaved?: boolean;
};

export type MediaPostCacheFields = {
  likeCount?: number;
  viewerHasLiked?: boolean;
  commentCount?: number;
  viewerHasSaved?: boolean;
};

export type MediaPostCacheUpdater = (
  current: MediaPostCacheFields,
) => MediaPostCachePatch;

type InfiniteCache<Page> = {
  pages: Page[];
  pageParams?: unknown[];
};

type MediaPostCachePatchInput = MediaPostCachePatch | MediaPostCacheUpdater;

const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const resolvePatch = (
  current: MediaPostCacheFields,
  patchOrUpdater: MediaPostCachePatchInput,
) =>
  typeof patchOrUpdater === "function"
    ? patchOrUpdater(current)
    : patchOrUpdater;

const patchCacheFields = <T extends MediaPostCacheFields>(
  current: T,
  patchOrUpdater: MediaPostCachePatchInput,
): T => ({
  ...current,
  ...resolvePatch(current, patchOrUpdater),
});

const updateCount = (value: unknown, delta: number) =>
  Math.max(
    0,
    (typeof value === "number" && Number.isFinite(value) ? value : 0) + delta,
  );

export const buildMediaPostLikePatch = (
  current: Pick<MediaPostCacheFields, "likeCount" | "viewerHasLiked">,
): Required<Pick<MediaPostCachePatch, "likeCount" | "viewerHasLiked">> => {
  const viewerHasLiked = !current.viewerHasLiked;
  return {
    viewerHasLiked,
    likeCount: updateCount(current.likeCount, viewerHasLiked ? 1 : -1),
  };
};

export const buildMediaPostCommentCountPatch =
  (delta: number): MediaPostCacheUpdater =>
  (current) => ({
    commentCount: updateCount(current.commentCount, delta),
  });

export const buildMediaPostSavePatch = (
  current: Pick<MediaPostCacheFields, "viewerHasSaved">,
): Required<Pick<MediaPostCachePatch, "viewerHasSaved">> => ({
  viewerHasSaved: !current.viewerHasSaved,
});

export const patchMediaProfileCache = (
  current: InfiniteCache<ListProfileMediaResponse> | undefined,
  postId: string,
  patchOrUpdater: MediaPostCachePatchInput,
) => {
  if (!current?.pages) return current;
  return {
    ...current,
    pages: current.pages.map((page) => ({
      ...page,
      items: page.items.map((item) =>
        item.postId === postId
          ? patchCacheFields<ProfileMediaItem>(item, patchOrUpdater)
          : item,
      ),
    })),
  };
};

export const patchHomeFeedMediaPostCache = (
  current: HomeFeedResponse | undefined,
  postId: string,
  patchOrUpdater: MediaPostCachePatchInput,
) => {
  if (!current?.items) return current;
  return {
    ...current,
    items: current.items.map((item) => {
      if (item.type !== "media_post" || item.entityId !== postId) return item;
      const payload = isObject(item.payload) ? item.payload : {};
      return {
        ...item,
        payload: patchCacheFields(
          payload as Record<string, unknown> & MediaPostCacheFields,
          patchOrUpdater,
        ),
      } satisfies HomeFeedItem;
    }),
  };
};

export const patchActivityFeedMediaPostCache = (
  current: ActivityFeedResponse | undefined,
  postId: string,
  patchOrUpdater: MediaPostCachePatchInput,
) => {
  if (!current?.items) return current;
  return {
    ...current,
    items: current.items.map((item) => {
      if (item.type !== "media_post_created" || item.sourceId !== postId) {
        return item;
      }
      const stats = isObject(item.stats) ? item.stats : {};
      return {
        ...item,
        stats: patchCacheFields(
          stats as Record<string, unknown> & MediaPostCacheFields,
          patchOrUpdater,
        ),
      } satisfies ActivityFeedItem;
    }),
  };
};

export const patchMediaPostDetailCache = (
  current: MediaPostDetailResponse | undefined,
  postId: string,
  patchOrUpdater: MediaPostCachePatchInput,
) => {
  if (!current?.post?.post || current.post.post.id !== postId) return current;
  return {
    ...current,
    post: {
      ...current.post,
      post: patchCacheFields(current.post.post, patchOrUpdater),
      items: current.post.items.map((item) =>
        item.postId === postId ? patchCacheFields(item, patchOrUpdater) : item,
      ),
    },
  };
};

export function updateMediaPostInCaches(
  queryClient: QueryClient,
  postId: string,
  patchOrUpdater: MediaPostCachePatchInput,
) {
  queryClient.setQueriesData(
    { queryKey: queryKeys.media.profileLists() },
    (current: InfiniteCache<ListProfileMediaResponse> | undefined) =>
      patchMediaProfileCache(current, postId, patchOrUpdater),
  );

  queryClient.setQueriesData(
    { queryKey: queryKeys.feed.all },
    (current: HomeFeedResponse | undefined) =>
      patchHomeFeedMediaPostCache(current, postId, patchOrUpdater),
  );

  queryClient.setQueriesData(
    { queryKey: queryKeys.feed.activityAll },
    (current: ActivityFeedResponse | undefined) =>
      patchActivityFeedMediaPostCache(current, postId, patchOrUpdater),
  );

  queryClient.setQueriesData(
    { queryKey: queryKeys.explore.sites() },
    (current: ActivityFeedResponse | undefined) =>
      patchActivityFeedMediaPostCache(current, postId, patchOrUpdater),
  );

  queryClient.setQueriesData(
    { queryKey: queryKeys.media.postDetail(postId) },
    (current: MediaPostDetailResponse | undefined) =>
      patchMediaPostDetailCache(current, postId, patchOrUpdater),
  );
}

export function updateMediaPostCommentCountDelta(
  queryClient: QueryClient,
  postId: string,
  delta: number,
) {
  updateMediaPostInCaches(
    queryClient,
    postId,
    buildMediaPostCommentCountPatch(delta),
  );
}

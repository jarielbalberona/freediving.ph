import type { ListMineParams } from "../api/media";
import type {
  MediaPreset,
  MintMediaUrlItemRequest,
} from "@freediving.ph/types";
import { useMemo } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import {
  normalizeMediaListParams,
  normalizeMintMediaUrlItems,
  queryKeys,
} from "@/lib/query/query-keys";

import { mediaApi } from "../api/media";

export const useListMyMedia = (params: ListMineParams = {}, enabled = true) => {
  const normalizedParams = normalizeMediaListParams(params);
  return useQuery({
    queryKey: queryKeys.media.mine(normalizedParams),
    queryFn: () => mediaApi.listMine(params),
    enabled,
    staleTime: 30_000,
  });
};

export const useMintMediaUrls = (
  items: MintMediaUrlItemRequest[],
  enabled = true,
) => {
  const normalizedItems = useMemo(() => normalizeMintMediaUrlItems(items), [items]);

  return useQuery({
    queryKey: queryKeys.media.mintUrls(normalizedItems),
    queryFn: () => mediaApi.mintUrls(normalizedItems),
    enabled: enabled && normalizedItems.length > 0,
    staleTime: 10 * 60 * 1000,
    gcTime: 12 * 60 * 1000,
  });
};

export const useMintedMediaMap = (
  mediaIds: string[],
  preset: MediaPreset,
  enabled = true,
) => {
  const items = useMemo(
    () => mediaIds.map((mediaId) => ({ mediaId, preset }) as const),
    [mediaIds, preset],
  );

  const query = useMintMediaUrls(items, enabled);

  const urlMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of query.data?.items ?? []) {
      map.set(item.mediaId, item.url);
    }
    return map;
  }, [query.data?.items]);

  return {
    ...query,
    urlMap,
  };
};

export const useProfileMediaInfiniteQuery = (username: string, limit = 24) => {
  return useInfiniteQuery({
    queryKey: queryKeys.media.profile(username, limit),
    queryFn: ({ pageParam }: { pageParam?: string }) =>
      mediaApi.listProfileMedia(username, { limit, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
    staleTime: 60_000,
  });
};

export const useMediaPostQuery = (postId: string, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.media.postDetail(postId),
    queryFn: () => mediaApi.getPost(postId),
    enabled: enabled && Boolean(postId),
    staleTime: 30_000,
  });
};

export const useMediaPostCommentsInfiniteQuery = (
  postId: string,
  limit = 20,
  enabled = true,
) => {
  return useInfiniteQuery({
    queryKey: queryKeys.media.postComments(postId, limit),
    queryFn: ({ pageParam }: { pageParam?: string }) =>
      mediaApi.listPostComments(postId, { limit, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    enabled: enabled && Boolean(postId),
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
    staleTime: 15_000,
  });
};

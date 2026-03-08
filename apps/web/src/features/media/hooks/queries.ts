import type { ListMineParams } from "../api/media";
import type {
  MediaPreset,
  MintMediaUrlItemRequest,
} from "@freediving.ph/types";
import { useMemo } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { mediaApi } from "../api/media";

const sortItems = (items: MintMediaUrlItemRequest[]) => {
  return [...items].sort((a, b) => {
    const keyA = `${a.mediaId}:${a.preset}:${a.width ?? ""}:${a.format ?? ""}:${a.quality ?? ""}`;
    const keyB = `${b.mediaId}:${b.preset}:${b.width ?? ""}:${b.format ?? ""}:${b.quality ?? ""}`;
    return keyA.localeCompare(keyB);
  });
};

export const useListMyMedia = (params: ListMineParams = {}, enabled = true) => {
  return useQuery({
    queryKey: ["media", "mine", params],
    queryFn: () => mediaApi.listMine(params),
    enabled,
    staleTime: 30_000,
  });
};

export const useMintMediaUrls = (
  items: MintMediaUrlItemRequest[],
  enabled = true,
) => {
  const normalizedItems = useMemo(() => sortItems(items), [items]);

  return useQuery({
    queryKey: ["media", "mint-urls", normalizedItems],
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
    queryKey: ["media", "profile", username, limit],
    queryFn: ({ pageParam }: { pageParam?: string }) =>
      mediaApi.listProfileMedia(username, { limit, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
    staleTime: 60_000,
  });
};

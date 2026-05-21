import type { QueryClient } from "@tanstack/react-query";
import type {
  ExploreListResponse,
  ExploreSiteCard,
  ExploreSiteDetail,
  ExploreSiteDetailResponse,
  HomeFeedItem,
  HomeFeedResponse,
} from "@freediving.ph/types";

import { queryKeys } from "@/lib/query/query-keys";

export type DiveSiteCachePatch = {
  isSaved?: boolean;
  likeCount?: number;
  viewerHasLiked?: boolean;
};

export type DiveSiteCacheFields = {
  id?: string;
  slug?: string;
  isSaved?: boolean;
  likeCount?: number;
  viewerHasLiked?: boolean;
};

export type DiveSiteCacheUpdater = (
  current: DiveSiteCacheFields,
) => DiveSiteCachePatch;

type InfiniteCache<Page> = {
  pages: Page[];
  pageParams?: unknown[];
};

type DiveSiteCachePatchInput = DiveSiteCachePatch | DiveSiteCacheUpdater;

const resolvePatch = (
  current: DiveSiteCacheFields,
  patchOrUpdater: DiveSiteCachePatchInput,
) =>
  typeof patchOrUpdater === "function"
    ? patchOrUpdater(current)
    : patchOrUpdater;

const patchCacheFields = <T extends DiveSiteCacheFields>(
  current: T,
  patchOrUpdater: DiveSiteCachePatchInput,
): T => ({
  ...current,
  ...resolvePatch(current, patchOrUpdater),
});

const matchesDiveSite = (item: DiveSiteCacheFields, siteIdOrSlug: string) =>
  item.id === siteIdOrSlug || item.slug === siteIdOrSlug;

const updateCount = (value: unknown, delta: number) =>
  Math.max(
    0,
    (typeof value === "number" && Number.isFinite(value) ? value : 0) + delta,
  );

export const buildDiveSiteLikePatch = (
  current: Pick<DiveSiteCacheFields, "likeCount" | "viewerHasLiked">,
): Required<Pick<DiveSiteCachePatch, "likeCount" | "viewerHasLiked">> => {
  const viewerHasLiked = !current.viewerHasLiked;
  return {
    viewerHasLiked,
    likeCount: updateCount(current.likeCount, viewerHasLiked ? 1 : -1),
  };
};

export const buildDiveSiteSavePatch = (
  current: Pick<DiveSiteCacheFields, "isSaved">,
): Required<Pick<DiveSiteCachePatch, "isSaved">> => ({
  isSaved: !current.isSaved,
});

export const patchExploreListDiveSiteCache = (
  current: InfiniteCache<ExploreListResponse> | undefined,
  siteIdOrSlug: string,
  patchOrUpdater: DiveSiteCachePatchInput,
) => {
  if (!current?.pages) return current;
  return {
    ...current,
    pages: current.pages.map((page) => ({
      ...page,
      items: page.items.map((item) =>
        matchesDiveSite(item, siteIdOrSlug)
          ? patchCacheFields<ExploreSiteCard>(item, patchOrUpdater)
          : item,
      ),
    })),
  };
};

export const patchExploreSiteDetailCache = (
  current: ExploreSiteDetailResponse | undefined,
  siteIdOrSlug: string,
  patchOrUpdater: DiveSiteCachePatchInput,
) => {
  if (!current?.site || !matchesDiveSite(current.site, siteIdOrSlug)) {
    return current;
  }
  return {
    ...current,
    site: patchCacheFields<ExploreSiteDetail>(current.site, patchOrUpdater),
  };
};

export const patchHomeFeedDiveSiteCache = (
  current: HomeFeedResponse | undefined,
  siteIdOrSlug: string,
  patchOrUpdater: DiveSiteCachePatchInput,
) => {
  if (!current?.items) return current;
  return {
    ...current,
    items: current.items.map((item) => {
      if (item.type !== "dive_spot" || item.entityId !== siteIdOrSlug) {
        return item;
      }
      return {
        ...item,
        payload: patchCacheFields(
          item.payload as Record<string, unknown> & DiveSiteCacheFields,
          patchOrUpdater,
        ),
      } satisfies HomeFeedItem;
    }),
  };
};

export function updateDiveSiteInCaches(
  queryClient: QueryClient,
  siteIdOrSlug: string,
  patchOrUpdater: DiveSiteCachePatchInput,
) {
  queryClient.setQueriesData(
    { queryKey: queryKeys.explore.lists() },
    (current: InfiniteCache<ExploreListResponse> | undefined) =>
      patchExploreListDiveSiteCache(current, siteIdOrSlug, patchOrUpdater),
  );

  queryClient.setQueriesData(
    { queryKey: queryKeys.explore.sites() },
    (current: ExploreSiteDetailResponse | undefined) =>
      patchExploreSiteDetailCache(current, siteIdOrSlug, patchOrUpdater),
  );

  queryClient.setQueriesData(
    { queryKey: queryKeys.feed.all },
    (current: HomeFeedResponse | undefined) =>
      patchHomeFeedDiveSiteCache(current, siteIdOrSlug, patchOrUpdater),
  );
}

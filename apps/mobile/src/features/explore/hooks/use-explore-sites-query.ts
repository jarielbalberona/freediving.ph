import { useQuery } from "@tanstack/react-query";

import {
  getExploreSites,
  type ExploreSiteListParams,
} from "@/features/explore/api/explore-api";
import { mobileQueryKeys } from "@/lib/query";

const EXPLORE_SITE_LIMIT = 24;

export type ExploreSiteSortMode = "default" | "recent" | "popular";

export type ExploreSiteQueryParams = Omit<ExploreSiteListParams, "limit"> & {
  sort?: ExploreSiteSortMode;
};

export function useExploreSitesQuery(params: ExploreSiteQueryParams = {}) {
  const queryParams = {
    area: params.area?.trim() || undefined,
    difficulty: params.difficulty,
    limit: EXPLORE_SITE_LIMIT,
    savedOnly: params.savedOnly || undefined,
    search: params.search?.trim() || undefined,
    sort: params.sort ?? "default",
    verifiedOnly: params.verifiedOnly || undefined,
  };

  return useQuery({
    queryFn: () => getExploreSites(queryParams),
    queryKey: mobileQueryKeys.explore.siteList(queryParams),
    staleTime: 5 * 60 * 1000,
  });
}

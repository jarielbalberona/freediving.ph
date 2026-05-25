import { useQuery } from "@tanstack/react-query";

import { getExploreSites } from "@/features/explore/api/explore-api";
import { mobileQueryKeys } from "@/lib/query";

const EXPLORE_SITE_LIMIT = 24;

export function useExploreSitesQuery() {
  return useQuery({
    queryFn: () => getExploreSites({ limit: EXPLORE_SITE_LIMIT }),
    queryKey: mobileQueryKeys.explore.siteList({ limit: EXPLORE_SITE_LIMIT }),
    staleTime: 5 * 60 * 1000,
  });
}

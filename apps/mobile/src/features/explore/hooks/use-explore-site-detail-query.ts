import { useQuery } from "@tanstack/react-query";

import { getExploreSiteDetail } from "@/features/explore/api/explore-api";
import { mobileQueryKeys } from "@/lib/query";

export function useExploreSiteDetailQuery(slug: string | undefined) {
  return useQuery({
    enabled: Boolean(slug),
    queryFn: () => getExploreSiteDetail(slug ?? ""),
    queryKey: mobileQueryKeys.explore.siteDetail(slug ?? ""),
    staleTime: 5 * 60 * 1000,
  });
}

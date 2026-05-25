import { useQuery } from "@tanstack/react-query";

import { getHomeActivityFeed } from "@/features/home-feed/api/get-home-activity-feed";
import { mobileQueryKeys } from "@/lib/query";

const HOME_ACTIVITY_LIMIT = 20;

export function useHomeActivityFeedQuery() {
  return useQuery({
    queryFn: () => getHomeActivityFeed({ filter: "latest", limit: HOME_ACTIVITY_LIMIT }),
    queryKey: mobileQueryKeys.feed.activity({
      filter: "latest",
      limit: HOME_ACTIVITY_LIMIT,
    }),
    staleTime: 2 * 60 * 1000,
  });
}

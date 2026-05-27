import { type InfiniteData, useInfiniteQuery } from "@tanstack/react-query";

import type { ActivityFeedResponse } from "@freediving.ph/types";

import { getHomeActivityFeed } from "@/features/home-feed/api/get-home-activity-feed";
import { mobileQueryKeys } from "@/lib/query";

const HOME_ACTIVITY_LIMIT = 20;

export function useHomeActivityFeedQuery() {
  return useInfiniteQuery<
    ActivityFeedResponse,
    Error,
    InfiniteData<ActivityFeedResponse, string | undefined>,
    ReturnType<typeof mobileQueryKeys.feed.activity>,
    string | undefined
  >({
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      getHomeActivityFeed({
        cursor: pageParam,
        filter: "latest",
        limit: HOME_ACTIVITY_LIMIT,
      }),
    queryKey: mobileQueryKeys.feed.activity({
      filter: "latest",
      limit: HOME_ACTIVITY_LIMIT,
    }),
    staleTime: 2 * 60 * 1000,
  });
}

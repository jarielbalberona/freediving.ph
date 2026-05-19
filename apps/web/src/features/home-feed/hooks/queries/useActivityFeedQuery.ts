"use client";

import { useQuery } from "@tanstack/react-query";

import { getActivityFeed } from "@/features/home-feed/api/get-activity-feed";
import type { ActivityFeedFilter, HomeFeedMode } from "@freediving.ph/types";

export const useActivityFeedQuery = (params: {
  filter?: ActivityFeedFilter;
  mode?: HomeFeedMode;
  cursor?: string;
  region?: string;
  enabled?: boolean;
}) =>
  useQuery({
    queryKey: [
      "activity-feed",
      params.filter ?? "",
      params.mode ?? "",
      params.cursor ?? "",
      params.region ?? "",
    ],
    queryFn: () =>
      getActivityFeed({
        filter: params.filter,
        mode: params.mode,
        cursor: params.cursor,
        region: params.region,
        limit: 20,
      }),
    enabled: params.enabled ?? true,
  });

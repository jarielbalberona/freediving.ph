"use client";

import { useQuery } from "@tanstack/react-query";

import { getHomeFeed } from "@/features/home-feed/api/get-home-feed";
import { queryKeys } from "@/lib/query/query-keys";
import type { HomeFeedMode } from "@freediving.ph/types";

export const useHomeFeedQuery = (params: {
  mode: HomeFeedMode;
  cursor?: string;
  enabled?: boolean;
}) =>
  useQuery({
    queryKey: queryKeys.feed.list({
      source: "home",
      mode: params.mode,
      cursor: params.cursor,
      limit: 20,
    }),
    queryFn: () =>
      getHomeFeed({ mode: params.mode, cursor: params.cursor, limit: 20 }),
    enabled: params.enabled ?? true,
    staleTime: 2 * 60 * 1000,
  });

"use client";

import { useQuery } from "@tanstack/react-query";

import { getHomeFeed } from "@/features/home-feed/api/get-home-feed";
import type { HomeFeedMode } from "@freediving.ph/types";

export const useHomeFeedQuery = (params: {
  mode: HomeFeedMode;
  cursor?: string;
  enabled?: boolean;
}) =>
  useQuery({
    queryKey: ["home-feed", params.mode, params.cursor ?? ""],
    queryFn: () => getHomeFeed({ mode: params.mode, cursor: params.cursor, limit: 20 }),
    enabled: params.enabled ?? true,
  });

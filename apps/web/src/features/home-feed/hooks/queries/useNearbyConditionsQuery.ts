"use client";

import { useQuery } from "@tanstack/react-query";

import { getNearbyConditions } from "@/features/home-feed/api/get-nearby-conditions";
import { queryKeys } from "@/lib/query/query-keys";

export const useNearbyConditionsQuery = (params: {
  lat?: number;
  lng?: number;
}) =>
  useQuery({
    queryKey: queryKeys.feed.nearbyConditions(params),
    queryFn: () => getNearbyConditions(params),
    staleTime: 5 * 60 * 1000,
  });

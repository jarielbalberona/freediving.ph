"use client";

import { useQuery } from "@tanstack/react-query";

import { getNearbyConditions } from "@/features/home-feed/api/get-nearby-conditions";

export const useNearbyConditionsQuery = (params: {
  lat?: number;
  lng?: number;
}) =>
  useQuery({
    queryKey: [
      "nearby-conditions",
      params.lat?.toFixed(4) ?? "country",
      params.lng?.toFixed(4) ?? "country",
    ],
    queryFn: () => getNearbyConditions(params),
    staleTime: 5 * 60 * 1000,
  });

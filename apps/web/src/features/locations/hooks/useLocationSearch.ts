"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { locationsApi } from "../api/locations";
import { locationQueryKeys } from "./location-query-keys";

type UseLocationSearchParams = {
  search?: string;
  limit?: number;
  enabled?: boolean;
};

export function useLocationSearch(params: UseLocationSearchParams = {}) {
  const search = params.search?.trim() ?? "";
  const enabled = (params.enabled ?? true) && search.length >= 2;

  return useQuery({
    queryKey: locationQueryKeys.search({ search, limit: params.limit }),
    queryFn: () =>
      locationsApi.searchLocations({ search, limit: params.limit ?? 20 }),
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });
}

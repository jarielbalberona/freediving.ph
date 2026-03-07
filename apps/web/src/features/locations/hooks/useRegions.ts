import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { locationsApi } from "../api/locations";
import { locationQueryKeys } from "./location-query-keys";

type UseRegionsParams = {
  search?: string;
  limit?: number;
};

export function useRegions(params: UseRegionsParams = {}) {
  return useQuery({
    queryKey: locationQueryKeys.regions(params),
    queryFn: () => locationsApi.getRegions(params),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });
}

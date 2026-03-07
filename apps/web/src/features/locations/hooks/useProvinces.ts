import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { locationsApi } from "../api/locations";
import { locationQueryKeys } from "./location-query-keys";

type UseProvincesParams = {
  regionCode?: string;
  search?: string;
  limit?: number;
};

export function useProvinces(params: UseProvincesParams = {}) {
  return useQuery({
    queryKey: locationQueryKeys.provinces(params),
    queryFn: () => locationsApi.getProvinces(params),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });
}

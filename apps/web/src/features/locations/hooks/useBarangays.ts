import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { locationsApi } from "../api/locations";
import { locationQueryKeys } from "./location-query-keys";

type UseBarangaysParams = {
  cityMunicipalityCode?: string;
  provinceCode?: string;
  search?: string;
  limit?: number;
};

export function useBarangays(params: UseBarangaysParams = {}) {
  const enabled = Boolean(params.cityMunicipalityCode?.trim());

  return useQuery({
    queryKey: locationQueryKeys.barangays(params),
    queryFn: () => locationsApi.getBarangays(params),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
    enabled,
  });
}

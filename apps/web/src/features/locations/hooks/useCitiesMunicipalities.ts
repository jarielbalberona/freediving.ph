import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { locationsApi } from "../api/locations";
import { locationQueryKeys } from "./location-query-keys";

type UseCitiesMunicipalitiesParams = {
  regionCode?: string;
  provinceCode?: string;
  search?: string;
  limit?: number;
};

export function useCitiesMunicipalities(
  params: UseCitiesMunicipalitiesParams = {},
) {
  const enabled = Boolean(params.regionCode?.trim());

  return useQuery({
    queryKey: locationQueryKeys.citiesMunicipalities(params),
    queryFn: () => locationsApi.getCitiesMunicipalities(params),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
    enabled,
  });
}

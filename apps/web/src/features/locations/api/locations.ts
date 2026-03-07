import { axiosInstance } from "@/lib/http/axios";
import { routes } from "@/lib/api/fphgo-routes";
import type { PsgcItem } from "../types";

type LocationListParams = {
  search?: string;
  limit?: number;
};

type ProvinceListParams = LocationListParams & {
  regionCode?: string;
};

type CityMunicipalityListParams = LocationListParams & {
  regionCode?: string;
  provinceCode?: string;
};

type BarangayListParams = LocationListParams & {
  cityMunicipalityCode?: string;
  provinceCode?: string;
};

type ListRegionsResponse = { regions?: PsgcItem[] };
type ListProvincesResponse = { provinces?: PsgcItem[] };
type ListCitiesMunicipalitiesResponse = { citiesMunicipalities?: PsgcItem[] };
type ListBarangaysResponse = { barangays?: PsgcItem[] };

function normalizeSearch(search?: string) {
  return search?.trim() ?? "";
}

function normalizeCode(code?: string) {
  return code?.trim() ?? "";
}

function normalizeLimit(limit?: number, fallback = 100) {
  if (!limit || Number.isNaN(limit)) return fallback;
  return Math.max(1, Math.floor(limit));
}

function buildQueryString(params: Record<string, string | number | undefined>) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === "") return;
    searchParams.set(key, String(value));
  });

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export const locationsApi = {
  async getRegions(params: LocationListParams = {}) {
    const search = normalizeSearch(params.search);
    const limit = normalizeLimit(params.limit, 100);

    const response = await axiosInstance.get<ListRegionsResponse>(
      `${routes.v1.locations.regions()}${buildQueryString({ search, limit })}`,
    );

    return response.data.regions ?? [];
  },

  async getProvinces(params: ProvinceListParams = {}) {
    const regionCode = normalizeCode(params.regionCode);
    const search = normalizeSearch(params.search);
    const limit = normalizeLimit(params.limit, 100);

    const response = await axiosInstance.get<ListProvincesResponse>(
      `${routes.v1.locations.provinces()}${buildQueryString({
        regionCode,
        search,
        limit,
      })}`,
    );

    return response.data.provinces ?? [];
  },

  async getCitiesMunicipalities(params: CityMunicipalityListParams = {}) {
    const regionCode = normalizeCode(params.regionCode);
    const provinceCode = normalizeCode(params.provinceCode);
    const search = normalizeSearch(params.search);
    const limit = normalizeLimit(params.limit, 200);

    const response = await axiosInstance.get<ListCitiesMunicipalitiesResponse>(
      `${routes.v1.locations.citiesMunicipalities()}${buildQueryString({
        regionCode,
        provinceCode,
        search,
        limit,
      })}`,
    );

    return response.data.citiesMunicipalities ?? [];
  },

  async getBarangays(params: BarangayListParams = {}) {
    const cityMunicipalityCode = normalizeCode(params.cityMunicipalityCode);
    const provinceCode = normalizeCode(params.provinceCode);
    const search = normalizeSearch(params.search);
    const limit = normalizeLimit(params.limit, 200);

    const response = await axiosInstance.get<ListBarangaysResponse>(
      `${routes.v1.locations.barangays()}${buildQueryString({
        cityMunicipalityCode,
        provinceCode,
        search,
        limit,
      })}`,
    );

    return response.data.barangays ?? [];
  },
};

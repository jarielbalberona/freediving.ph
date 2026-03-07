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

export const locationQueryKeys = {
  all: ["locations"] as const,

  regions: (params?: { search?: string; limit?: number }) =>
    [
      ...locationQueryKeys.all,
      "regions",
      {
        search: normalizeSearch(params?.search),
        limit: normalizeLimit(params?.limit, 100),
      },
    ] as const,

  provinces: (params?: { regionCode?: string; search?: string; limit?: number }) =>
    [
      ...locationQueryKeys.all,
      "provinces",
      {
        regionCode: normalizeCode(params?.regionCode),
        search: normalizeSearch(params?.search),
        limit: normalizeLimit(params?.limit, 100),
      },
    ] as const,

  citiesMunicipalities: (params?: {
    regionCode?: string;
    provinceCode?: string;
    search?: string;
    limit?: number;
  }) =>
    [
      ...locationQueryKeys.all,
      "cities-municipalities",
      {
        regionCode: normalizeCode(params?.regionCode),
        provinceCode: normalizeCode(params?.provinceCode),
        search: normalizeSearch(params?.search),
        limit: normalizeLimit(params?.limit, 200),
      },
    ] as const,

  barangays: (params?: {
    cityMunicipalityCode?: string;
    provinceCode?: string;
    search?: string;
    limit?: number;
  }) =>
    [
      ...locationQueryKeys.all,
      "barangays",
      {
        cityMunicipalityCode: normalizeCode(params?.cityMunicipalityCode),
        provinceCode: normalizeCode(params?.provinceCode),
        search: normalizeSearch(params?.search),
        limit: normalizeLimit(params?.limit, 200),
      },
    ] as const,
};

import { z } from "zod";

export const locationSearchSchema = z.object({
  locationName: z.string().optional(),
  formattedAddress: z.string().optional(),
  regionCode: z.string().optional(),
  regionName: z.string().optional(),
  provinceCode: z.string().optional(),
  provinceName: z.string().optional(),
  cityCode: z.string().optional(),
  cityName: z.string().optional(),
  barangayCode: z.string().optional(),
  barangayName: z.string().optional(),
  locationSource: z.enum(["manual", "google_places", "psgc_mapped", "unmapped"]).optional(),
});

export type LocationSearchFormValues = z.infer<typeof locationSearchSchema>;
export type LocationSearchValue = LocationSearchFormValues;

export type PsgcItem = {
  code: string;
  name: string;
  psgcCode: string;
  oldName?: string | null;
};

export const EMPTY_LOCATION_SEARCH_VALUE: LocationSearchFormValues = {
  locationName: "",
  formattedAddress: "",
  regionCode: "",
  regionName: "",
  provinceCode: "",
  provinceName: "",
  cityCode: "",
  cityName: "",
  barangayCode: "",
  barangayName: "",
  locationSource: "manual",
};

export function toFormDefaultValues(
  value?: Partial<LocationSearchValue> | null,
): LocationSearchFormValues {
  return {
    locationName: value?.locationName ?? "",
    formattedAddress: value?.formattedAddress ?? "",
    regionCode: value?.regionCode ?? "",
    regionName: value?.regionName ?? "",
    provinceCode: value?.provinceCode ?? "",
    provinceName: value?.provinceName ?? "",
    cityCode: value?.cityCode ?? "",
    cityName: value?.cityName ?? "",
    barangayCode: value?.barangayCode ?? "",
    barangayName: value?.barangayName ?? "",
    locationSource: value?.locationSource ?? "manual",
  };
}

export function toLocationSearchValue(
  value: LocationSearchFormValues,
): LocationSearchValue {
  return {
    locationName: value.locationName || "",
    formattedAddress: value.formattedAddress || "",
    regionCode: value.regionCode || "",
    regionName: value.regionName || "",
    provinceCode: value.provinceCode || "",
    provinceName: value.provinceName || "",
    cityCode: value.cityCode || "",
    cityName: value.cityName || "",
    barangayCode: value.barangayCode || "",
    barangayName: value.barangayName || "",
    locationSource: value.locationSource ?? "manual",
  };
}

export function areLocationSearchValuesEqual(
  a?: Partial<LocationSearchValue> | null,
  b?: Partial<LocationSearchValue> | null,
) {
  const left = toFormDefaultValues(a);
  const right = toFormDefaultValues(b);

  return (
    left.locationName === right.locationName &&
    left.formattedAddress === right.formattedAddress &&
    left.regionCode === right.regionCode &&
    left.regionName === right.regionName &&
    left.provinceCode === right.provinceCode &&
    left.provinceName === right.provinceName &&
    left.cityCode === right.cityCode &&
    left.cityName === right.cityName &&
    left.barangayCode === right.barangayCode &&
    left.barangayName === right.barangayName &&
    left.locationSource === right.locationSource
  );
}

export function buildDisplayLocation(value?: Partial<LocationSearchValue> | null) {
  const v = toFormDefaultValues(value);

  const parts = [
    v.locationName,
    v.formattedAddress,
    v.barangayName,
    v.cityName,
    v.provinceName,
    v.regionName,
  ]
    .map((part) => (part ?? "").trim())
    .filter(Boolean);

  return Array.from(new Set(parts)).join(", ");
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ComboboxOption } from "@/components/ui/combobox";

import { useDebouncedValue } from "./useDebouncedValue";
import { useBarangays } from "./useBarangays";
import { useCitiesMunicipalities } from "./useCitiesMunicipalities";
import { useProvinces } from "./useProvinces";
import { useRegions } from "./useRegions";

import {
  EMPTY_LOCATION_SEARCH_VALUE,
  areLocationSearchValuesEqual,
  buildDisplayLocation,
  locationSearchSchema,
  toFormDefaultValues,
  toLocationSearchValue,
  type LocationSearchFormValues,
  type LocationSearchValue,
  type PsgcItem,
} from "../types";

type UseLocationSelectionArgs = {
  value: LocationSearchValue;
  onChange: (next: LocationSearchValue) => void;
};

type SearchState = {
  region: string;
  province: string;
  city: string;
  barangay: string;
};

type SearchScope = "all" | "province-down" | "city-down" | "barangay-only";

const DEFAULT_SEARCH_STATE: SearchState = {
  region: "",
  province: "",
  city: "",
  barangay: "",
};

const toOption = (item: PsgcItem): ComboboxOption => ({
  value: item.code,
  label: item.name,
  keywords: [item.psgcCode, item.oldName ?? ""].filter(Boolean),
});

export function useLocationSelection({
  value,
  onChange,
}: UseLocationSelectionArgs) {
  const form = useForm<LocationSearchFormValues>({
    resolver: zodResolver(locationSearchSchema),
    defaultValues: toFormDefaultValues(value),
  });

  const [search, setSearch] = useState<SearchState>(DEFAULT_SEARCH_STATE);
  const isApplyingExternalValueRef = useRef(false);

  const debouncedRegionSearch = useDebouncedValue(search.region, 250);
  const debouncedProvinceSearch = useDebouncedValue(search.province, 250);
  const debouncedCitySearch = useDebouncedValue(search.city, 250);
  const debouncedBarangaySearch = useDebouncedValue(search.barangay, 250);

  const locationName = useWatch({ control: form.control, name: "locationName" }) ?? "";
  const formattedAddress =
    useWatch({ control: form.control, name: "formattedAddress" }) ?? "";
  const regionCode = useWatch({ control: form.control, name: "regionCode" }) ?? "";
  const regionName = useWatch({ control: form.control, name: "regionName" }) ?? "";
  const provinceCode = useWatch({ control: form.control, name: "provinceCode" }) ?? "";
  const provinceName = useWatch({ control: form.control, name: "provinceName" }) ?? "";
  const cityCode = useWatch({ control: form.control, name: "cityCode" }) ?? "";
  const cityName = useWatch({ control: form.control, name: "cityName" }) ?? "";
  const barangayCode = useWatch({ control: form.control, name: "barangayCode" }) ?? "";
  const barangayName = useWatch({ control: form.control, name: "barangayName" }) ?? "";
  const locationSource =
    useWatch({ control: form.control, name: "locationSource" }) ?? "manual";

  const currentFormValue = useMemo<LocationSearchFormValues>(
    () => ({
      locationName,
      formattedAddress,
      regionCode,
      regionName,
      provinceCode,
      provinceName,
      cityCode,
      cityName,
      barangayCode,
      barangayName,
      locationSource,
    }),
    [
      locationName,
      formattedAddress,
      regionCode,
      regionName,
      provinceCode,
      provinceName,
      cityCode,
      cityName,
      barangayCode,
      barangayName,
      locationSource,
    ],
  );

  const clearSearches = useCallback((scope: SearchScope) => {
    setSearch((current) => {
      switch (scope) {
        case "all":
          return DEFAULT_SEARCH_STATE;
        case "province-down":
          return {
            ...current,
            province: "",
            city: "",
            barangay: "",
          };
        case "city-down":
          return {
            ...current,
            city: "",
            barangay: "",
          };
        case "barangay-only":
          return {
            ...current,
            barangay: "",
          };
        default:
          return current;
      }
    });
  }, []);

  const setRegionSearch = useCallback((value: string) => {
    setSearch((current) => ({ ...current, region: value }));
  }, []);

  const setProvinceSearch = useCallback((value: string) => {
    setSearch((current) => ({ ...current, province: value }));
  }, []);

  const setCitySearch = useCallback((value: string) => {
    setSearch((current) => ({ ...current, city: value }));
  }, []);

  const setBarangaySearch = useCallback((value: string) => {
    setSearch((current) => ({ ...current, barangay: value }));
  }, []);

  const commitPatch = useCallback(
    (
      patch: Partial<LocationSearchFormValues>,
      options?: {
        clearSearchScope?: SearchScope;
      },
    ) => {
      const nextValue = {
        ...form.getValues(),
        ...patch,
      };

      const currentValue = toFormDefaultValues(form.getValues());

      if (!areLocationSearchValuesEqual(currentValue, nextValue)) {
        form.reset(nextValue, {
          keepErrors: true,
          keepTouched: true,
          keepIsSubmitted: true,
          keepSubmitCount: true,
        });
      }

      if (options?.clearSearchScope) {
        clearSearches(options.clearSearchScope);
      }
    },
    [clearSearches, form],
  );

  useEffect(() => {
    const nextExternalValue = toFormDefaultValues(value);
    const currentInternalValue = toFormDefaultValues(form.getValues());

    if (areLocationSearchValuesEqual(currentInternalValue, nextExternalValue)) {
      return;
    }

    isApplyingExternalValueRef.current = true;
    form.reset(nextExternalValue, {
      keepErrors: true,
      keepTouched: true,
      keepIsSubmitted: true,
      keepSubmitCount: true,
    });
  }, [form, value]);

  useEffect(() => {
    if (isApplyingExternalValueRef.current) {
      isApplyingExternalValueRef.current = false;
      return;
    }

    if (areLocationSearchValuesEqual(value, currentFormValue)) {
      return;
    }

    onChange(toLocationSearchValue(currentFormValue));
  }, [currentFormValue, onChange, value]);

  const regionsQuery = useRegions({
    search: debouncedRegionSearch,
    limit: 100,
  });

  const provincesQuery = useProvinces({
    regionCode,
    search: debouncedProvinceSearch,
    limit: 150,
  });

  const citiesQuery = useCitiesMunicipalities({
    regionCode,
    provinceCode,
    search: debouncedCitySearch,
    limit: 250,
  });

  const barangaysQuery = useBarangays({
    cityMunicipalityCode: cityCode,
    provinceCode,
    search: debouncedBarangaySearch,
    limit: 300,
  });

  const regions = regionsQuery.data ?? [];
  const provinces = provincesQuery.data ?? [];
  const cities = citiesQuery.data ?? [];
  const barangays = barangaysQuery.data ?? [];

  const regionOptions = useMemo(() => regions.map(toOption), [regions]);
  const provinceOptions = useMemo(() => provinces.map(toOption), [provinces]);
  const cityOptions = useMemo(() => cities.map(toOption), [cities]);
  const barangayOptions = useMemo(() => barangays.map(toOption), [barangays]);

  const displayLocation = useMemo(
    () => buildDisplayLocation(currentFormValue),
    [currentFormValue],
  );

  const markManualEntry = useCallback(() => {
    if (form.getValues("locationSource") === "manual") return;

    form.setValue("locationSource", "manual", {
      shouldDirty: true,
      shouldTouch: true,
    });
  }, [form]);

  const selectRegion = useCallback(
    (code: string | null) => {
      if (code === regionCode) return;

      if (!code) {
        commitPatch(
          {
            regionCode: "",
            regionName: "",
            provinceCode: "",
            provinceName: "",
            cityCode: "",
            cityName: "",
            barangayCode: "",
            barangayName: "",
            locationSource: "manual",
          },
          { clearSearchScope: "all" },
        );
        return;
      }

      const selected = regions.find((item) => item.code === code);

      commitPatch(
        {
          regionCode: code,
          regionName: selected?.name ?? "",
          provinceCode: "",
          provinceName: "",
          cityCode: "",
          cityName: "",
          barangayCode: "",
          barangayName: "",
          locationSource: "psgc_mapped",
        },
        { clearSearchScope: "province-down" },
      );

      setRegionSearch("");
    },
    [commitPatch, regionCode, regions, setRegionSearch],
  );

  const selectProvince = useCallback(
    (code: string | null) => {
      if (code === provinceCode) return;

      if (!code) {
        commitPatch(
          {
            provinceCode: "",
            provinceName: "",
            cityCode: "",
            cityName: "",
            barangayCode: "",
            barangayName: "",
            locationSource: "manual",
          },
          { clearSearchScope: "province-down" },
        );
        return;
      }

      const selected = provinces.find((item) => item.code === code);

      commitPatch(
        {
          provinceCode: code,
          provinceName: selected?.name ?? "",
          cityCode: "",
          cityName: "",
          barangayCode: "",
          barangayName: "",
          locationSource: "psgc_mapped",
        },
        { clearSearchScope: "city-down" },
      );

      setProvinceSearch("");
    },
    [commitPatch, provinceCode, provinces, setProvinceSearch],
  );

  const selectCity = useCallback(
    (code: string | null) => {
      if (code === cityCode) return;

      if (!code) {
        commitPatch(
          {
            cityCode: "",
            cityName: "",
            barangayCode: "",
            barangayName: "",
            locationSource: "manual",
          },
          { clearSearchScope: "city-down" },
        );
        return;
      }

      const selected = cities.find((item) => item.code === code);

      commitPatch(
        {
          cityCode: code,
          cityName: selected?.name ?? "",
          barangayCode: "",
          barangayName: "",
          locationSource: "psgc_mapped",
        },
        { clearSearchScope: "barangay-only" },
      );

      setCitySearch("");
    },
    [cities, cityCode, commitPatch, setCitySearch],
  );

  const selectBarangay = useCallback(
    (code: string | null) => {
      if (code === barangayCode) return;

      if (!code) {
        commitPatch(
          {
            barangayCode: "",
            barangayName: "",
            locationSource: "manual",
          },
          { clearSearchScope: "barangay-only" },
        );
        return;
      }

      const selected = barangays.find((item) => item.code === code);

      commitPatch(
        {
          barangayCode: code,
          barangayName: selected?.name ?? "",
          locationSource: "psgc_mapped",
        },
        { clearSearchScope: "barangay-only" },
      );

      setBarangaySearch("");
    },
    [barangayCode, barangays, commitPatch, setBarangaySearch],
  );

  const clearAll = useCallback(() => {
    commitPatch(EMPTY_LOCATION_SEARCH_VALUE, { clearSearchScope: "all" });
  }, [commitPatch]);

  return {
    form,

    values: {
      locationName,
      formattedAddress,
      regionCode,
      regionName,
      provinceCode,
      provinceName,
      cityCode,
      cityName,
      barangayCode,
      barangayName,
      locationSource,
      displayLocation,
    },

    queries: {
      regionsQuery,
      provincesQuery,
      citiesQuery,
      barangaysQuery,
    },

    options: {
      regionOptions,
      provinceOptions,
      cityOptions,
      barangayOptions,
    },

    search: {
      regionSearch: search.region,
      setRegionSearch,
      provinceSearch: search.province,
      setProvinceSearch,
      citySearch: search.city,
      setCitySearch,
      barangaySearch: search.barangay,
      setBarangaySearch,
    },

    loading: {
      regions: regionsQuery.isLoading,
      provinces: provincesQuery.isLoading,
      cities: citiesQuery.isLoading,
      barangays: barangaysQuery.isLoading,
      any:
        regionsQuery.isLoading ||
        provincesQuery.isLoading ||
        citiesQuery.isLoading ||
        barangaysQuery.isLoading,
    },

    actions: {
      markManualEntry,
      selectRegion,
      selectProvince,
      selectCity,
      selectBarangay,
      clearAll,
    },
  };
}

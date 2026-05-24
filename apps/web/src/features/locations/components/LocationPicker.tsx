"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import {
  useDebouncedValue,
  useLocationSearch,
  useLocationSelection,
} from "../hooks";
import type { LocationSearchResult, LocationSearchValue } from "../types";
import { LocationCombobox } from "./LocationCombobox";

export type LocationPickerMode = "administrative" | "place" | "hybrid";

export type LocationPickerProps = {
  value: LocationSearchValue;
  onChange: (next: LocationSearchValue) => void;
  disabled?: boolean;
  loading?: boolean;
  mode?: LocationPickerMode;
  compact?: boolean;
  detailsDefaultOpen?: boolean;
  className?: string;
  errors?: Partial<Record<keyof LocationSearchValue, ReactNode>>;
  searchPlaceholder?: string;
  helperText?: string;
};

const resultTypeLabels: Record<LocationSearchResult["type"], string> = {
  region: "Region",
  province: "Province",
  city: "City or municipality",
  barangay: "Barangay",
};

export function LocationPicker({
  value,
  onChange,
  disabled = false,
  loading = false,
  mode = "hybrid",
  compact = false,
  detailsDefaultOpen,
  className,
  errors,
  searchPlaceholder = "Search for a place",
  helperText = "Start typing a city, province, barangay, dive spot, or venue.",
}: LocationPickerProps) {
  const { form, values, queries, options, search, actions } =
    useLocationSelection({
      value,
      onChange,
    });
  const [placeSearch, setPlaceSearch] = useState("");
  const [selectedResult, setSelectedResult] =
    useState<LocationSearchResult | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(
    detailsDefaultOpen ?? mode === "administrative",
  );
  const debouncedPlaceSearch = useDebouncedValue(placeSearch, 250);
  const searchQuery = useLocationSearch({
    search: debouncedPlaceSearch,
    limit: 20,
    enabled: !disabled && !loading,
  });

  const searchResults = searchQuery.data?.results ?? [];
  const diagnostics = searchQuery.data?.diagnostics;
  const seedIsEmpty = diagnostics?.seeded === false;
  const searchEmptyMessage = getSearchEmptyMessage({
    search: placeSearch,
    loading: searchQuery.isLoading,
    seedIsEmpty,
  });
  const isDisabled = disabled || loading;
  const fieldGridClassName = compact
    ? "grid gap-3"
    : "grid gap-3 md:grid-cols-2";
  const showNameFields = mode !== "administrative";

  const selectedLocation = useMemo(
    () => values.displayLocation || "No location selected yet.",
    [values.displayLocation],
  );

  const renderError = (field: keyof LocationSearchValue) =>
    errors?.[field] ? (
      <p className="text-sm font-medium text-destructive">{errors[field]}</p>
    ) : null;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="space-y-1.5">
        <LocationResultCombobox
          results={searchResults}
          value={selectedResult}
          inputValue={placeSearch}
          onInputValueChange={setPlaceSearch}
          onValueChange={(result) => {
            setSelectedResult(result);
            if (!result) return;
            actions.selectSearchResult(result);
            setPlaceSearch("");
            setDetailsOpen(true);
          }}
          placeholder={searchPlaceholder}
          emptyMessage={searchEmptyMessage}
          disabled={isDisabled}
          loading={searchQuery.isLoading}
        />
        <p className="text-xs leading-5 text-muted-foreground">{helperText}</p>
        {seedIsEmpty ? (
          <p className="text-xs leading-5 text-destructive">
            Location data is not loaded yet. You can still type address details
            below, but search will be limited until the location seed is
            available.
          </p>
        ) : null}
      </div>

      <div className="flex items-start justify-between gap-3 rounded-md border border-border/70 bg-muted/30 px-3 py-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">
            Selected location
          </p>
          <p className="truncate text-sm">{selectedLocation}</p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={actions.clearAll}
          disabled={isDisabled}
        >
          Clear location
        </Button>
      </div>

      <Form {...form}>
        <details
          className="group rounded-md border border-border/70"
          open={detailsOpen}
          onToggle={(event) => setDetailsOpen(event.currentTarget.open)}
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-medium marker:hidden">
            <span>Adjust location details</span>
            <span className="text-xs text-muted-foreground group-open:hidden">
              Open
            </span>
            <span className="hidden text-xs text-muted-foreground group-open:inline">
              Close
            </span>
          </summary>
          <div className="space-y-3 border-t border-border/70 p-3">
            {showNameFields ? (
              <div className={fieldGridClassName}>
                <FormField
                  control={form.control}
                  name="locationName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Place or area name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value ?? ""}
                          placeholder="Example: Mabini training area"
                          onChange={(event) => {
                            field.onChange(event.target.value);
                            actions.markManualEntry();
                          }}
                          disabled={isDisabled}
                        />
                      </FormControl>
                      {renderError("locationName")}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="formattedAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address details</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value ?? ""}
                          placeholder="Example: Near the public market"
                          onChange={(event) => {
                            field.onChange(event.target.value);
                            actions.markManualEntry();
                          }}
                          disabled={isDisabled}
                        />
                      </FormControl>
                      {renderError("formattedAddress")}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ) : null}

            <div className={fieldGridClassName}>
              <FormField
                control={form.control}
                name="regionCode"
                render={() => (
                  <FormItem>
                    <FormLabel>Region</FormLabel>
                    <FormControl>
                      <LocationCombobox
                        options={options.regionOptions}
                        value={values.regionCode}
                        valueLabel={values.regionName}
                        onValueChange={actions.selectRegion}
                        inputValue={search.regionSearch}
                        onInputValueChange={search.setRegionSearch}
                        searchPlaceholder={
                          queries.regionsQuery.isLoading
                            ? "Loading regions..."
                            : "Search region"
                        }
                        emptyMessage={
                          queries.regionsQuery.isLoading
                            ? "Loading regions..."
                            : "No regions found."
                        }
                        disabled={isDisabled}
                      />
                    </FormControl>
                    {renderError("regionCode")}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="provinceCode"
                render={() => (
                  <FormItem>
                    <FormLabel>Province</FormLabel>
                    <FormControl>
                      <LocationCombobox
                        options={options.provinceOptions}
                        value={values.provinceCode}
                        valueLabel={values.provinceName}
                        onValueChange={actions.selectProvince}
                        inputValue={search.provinceSearch}
                        onInputValueChange={search.setProvinceSearch}
                        searchPlaceholder={
                          queries.provincesQuery.isLoading
                            ? "Loading provinces..."
                            : "Search province"
                        }
                        emptyMessage={
                          queries.provincesQuery.isLoading
                            ? "Loading provinces..."
                            : "No provinces found."
                        }
                        disabled={isDisabled || !values.regionCode}
                      />
                    </FormControl>
                    {renderError("provinceCode")}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cityCode"
                render={() => (
                  <FormItem>
                    <FormLabel>City or municipality</FormLabel>
                    <FormControl>
                      <LocationCombobox
                        options={options.cityOptions}
                        value={values.cityCode}
                        valueLabel={values.cityName}
                        onValueChange={actions.selectCity}
                        inputValue={search.citySearch}
                        onInputValueChange={search.setCitySearch}
                        searchPlaceholder={
                          queries.citiesQuery.isLoading
                            ? "Loading cities or municipalities..."
                            : "Search city or municipality"
                        }
                        emptyMessage={
                          queries.citiesQuery.isLoading
                            ? "Loading cities or municipalities..."
                            : "No cities or municipalities found."
                        }
                        disabled={isDisabled || !values.regionCode}
                      />
                    </FormControl>
                    {renderError("cityCode")}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="barangayCode"
                render={() => (
                  <FormItem>
                    <FormLabel>Barangay</FormLabel>
                    <FormControl>
                      <LocationCombobox
                        options={options.barangayOptions}
                        value={values.barangayCode}
                        valueLabel={values.barangayName}
                        onValueChange={actions.selectBarangay}
                        inputValue={search.barangaySearch}
                        onInputValueChange={search.setBarangaySearch}
                        searchPlaceholder={
                          queries.barangaysQuery.isLoading
                            ? "Loading barangays..."
                            : "Search barangay"
                        }
                        emptyMessage={
                          queries.barangaysQuery.isLoading
                            ? "Loading barangays..."
                            : "No barangays found."
                        }
                        disabled={isDisabled || !values.cityCode}
                      />
                    </FormControl>
                    {renderError("barangayCode")}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </details>
      </Form>
    </div>
  );
}

type LocationPickerCardProps = LocationPickerProps & {
  title?: string;
};

export function LocationPickerCard({
  title = "Location",
  ...props
}: LocationPickerCardProps) {
  return (
    <Card className="py-0">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <LocationPicker {...props} />
      </CardContent>
    </Card>
  );
}

type LocationResultComboboxProps = {
  results: LocationSearchResult[];
  value: LocationSearchResult | null;
  inputValue: string;
  onInputValueChange: (value: string) => void;
  onValueChange: (result: LocationSearchResult | null) => void;
  placeholder: string;
  emptyMessage: string;
  disabled?: boolean;
  loading?: boolean;
};

function LocationResultCombobox({
  results,
  value,
  inputValue,
  onInputValueChange,
  onValueChange,
  placeholder,
  emptyMessage,
  disabled,
  loading,
}: LocationResultComboboxProps) {
  return (
    <Combobox
      value={value}
      onValueChange={(nextValue) =>
        onValueChange((nextValue as LocationSearchResult | null) ?? null)
      }
      inputValue={inputValue}
      onInputValueChange={(nextInputValue) =>
        onInputValueChange(nextInputValue ?? "")
      }
      items={results}
      filteredItems={results}
      itemToStringValue={(item) => (item as LocationSearchResult).label}
      itemToStringLabel={(item) => (item as LocationSearchResult).label}
      isItemEqualToValue={(a, b) =>
        resultKey(a as LocationSearchResult) ===
        resultKey(b as LocationSearchResult)
      }
      disabled={disabled}
    >
      <ComboboxInput
        placeholder={loading ? "Searching..." : placeholder}
        showClear={inputValue.length > 0}
        disabled={disabled}
        autoComplete="off"
      />
      <ComboboxContent>
        <ComboboxEmpty className="px-3 py-3 text-left">
          {emptyMessage}
        </ComboboxEmpty>
        <ComboboxList>
          {(item: LocationSearchResult) => (
            <ComboboxItem
              value={item}
              key={resultKey(item)}
              className="items-start"
            >
              <MapPin className="mt-0.5 size-4 text-muted-foreground" />
              <span className="min-w-0">
                <span className="block truncate">{item.label}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {item.hierarchyLabel || resultTypeLabels[item.type]}
                </span>
              </span>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

function getSearchEmptyMessage({
  search,
  loading,
  seedIsEmpty,
}: {
  search: string;
  loading: boolean;
  seedIsEmpty: boolean;
}) {
  if (loading) return "Searching locations...";
  if (seedIsEmpty) return "Location data is not loaded yet.";
  if (search.trim().length < 2) return "Type at least 2 characters to search.";
  return "No matching places found. Adjust location details below.";
}

function resultKey(result: LocationSearchResult) {
  return [
    result.type,
    result.regionCode,
    result.provinceCode,
    result.cityCode,
    result.barangayCode,
    result.label,
  ]
    .filter(Boolean)
    .join(":");
}

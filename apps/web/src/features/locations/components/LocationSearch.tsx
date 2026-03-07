"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

import { useLocationSelection } from "../hooks";
import type { LocationSearchValue } from "../types";
import { LocationCombobox } from "./LocationCombobox";

type LocationSearchProps = {
  value: LocationSearchValue;
  onChange: (next: LocationSearchValue) => void;
  disabled?: boolean;
};

export function LocationSearch({
  value,
  onChange,
  disabled = false,
}: LocationSearchProps) {
  const { form, values, queries, options, search, actions } = useLocationSelection({
    value,
    onChange,
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">Location Search</CardTitle>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={actions.clearAll}
            disabled={disabled}
          >
            Clear Codes
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <Form {...form}>
          <div className="grid gap-3 md:grid-cols-2">
            <FormField
              control={form.control}
              name="locationName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Venue / Location name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      placeholder="e.g. Dugong Bughaw Dive Camp"
                      onChange={(e) => {
                        field.onChange(e.target.value);
                        actions.markManualEntry();
                      }}
                      disabled={disabled}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="formattedAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address details / landmark</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      placeholder="e.g. Along National Highway, near public market"
                      onChange={(e) => {
                        field.onChange(e.target.value);
                        actions.markManualEntry();
                      }}
                      disabled={disabled}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
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
                        queries.regionsQuery.isLoading ? "Loading regions..." : "Search region"
                      }
                      emptyMessage={
                        queries.regionsQuery.isLoading ? "Loading regions..." : "No regions found."
                      }
                      disabled={disabled}
                    />
                  </FormControl>
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
                      disabled={disabled || !values.regionCode}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cityCode"
              render={() => (
                <FormItem>
                  <FormLabel>City / Municipality</FormLabel>
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
                          ? "Loading cities/municipalities..."
                          : "Search city or municipality"
                      }
                      emptyMessage={
                        queries.citiesQuery.isLoading
                          ? "Loading cities/municipalities..."
                          : "No cities or municipalities found."
                      }
                      disabled={disabled || !values.regionCode}
                    />
                  </FormControl>
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
                      disabled={disabled || !values.cityCode}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </Form>

        <div className="rounded-md border bg-muted/30 p-3">
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="outline">Resolved</Badge>
            <span className="text-xs text-muted-foreground">
              {values.locationSource === "psgc_mapped"
                ? "Canonical PSGC mapping"
                : "Manual entry"}
            </span>
          </div>
          <p className="text-sm font-medium">
            {values.displayLocation || "No structured location selected yet."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

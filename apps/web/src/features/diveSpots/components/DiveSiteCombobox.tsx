"use client";

import type { ExploreSiteCard } from "@freediving.ph/types";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import type { ComboboxOption } from "@/components/ui/combobox";
import { LocationCombobox } from "@/features/locations/components/LocationCombobox";
import { exploreApi } from "@/features/diveSpots/api/explore-v1";
import { queryKeys } from "@/lib/query/query-keys";

export type DiveSiteComboboxValueKey = "id" | "slug";

type DiveSiteComboboxAllOption = {
  value: string;
  label: string;
};

type DiveSiteComboboxProps = {
  value: string;
  valueLabel?: string;
  valueKey?: DiveSiteComboboxValueKey;
  onValueChange: (value: string, site: ExploreSiteCard | null) => void;
  disabled?: boolean;
  id?: string;
  limit?: number;
  allOption?: DiveSiteComboboxAllOption;
  searchPlaceholder?: string;
  emptyMessage?: string;
  loadingMessage?: string;
};

const DEFAULT_LIMIT = 20;

export function formatDiveSiteOptionLabel(site: ExploreSiteCard) {
  return [site.name, site.area].filter(Boolean).join(" · ");
}

export function DiveSiteCombobox({
  value,
  valueLabel,
  valueKey = "id",
  onValueChange,
  disabled,
  id,
  limit = DEFAULT_LIMIT,
  allOption,
  searchPlaceholder = "Search approved dive sites",
  emptyMessage = "No dive sites found",
  loadingMessage = "Loading dive sites...",
}: DiveSiteComboboxProps) {
  const [search, setSearch] = useState("");
  const cleanSearch = search.trim();
  const query = useQuery({
    queryKey: [...queryKeys.explore.sitePicker(cleanSearch), "limit", limit],
    queryFn: () =>
      exploreApi.listSites({
        search: cleanSearch || undefined,
        limit,
      }),
    staleTime: 60_000,
  });

  const sites = query.data?.items ?? [];
  const options = useMemo<ComboboxOption[]>(() => {
    const siteOptions = sites.map((site) => ({
      value: getDiveSiteValue(site, valueKey),
      label: formatDiveSiteOptionLabel(site),
      keywords: [site.slug, site.name, site.area],
    }));

    if (!allOption) return siteOptions;

    return [
      {
        value: allOption.value,
        label: allOption.label,
        keywords: [allOption.label],
      },
      ...siteOptions,
    ];
  }, [allOption, sites, valueKey]);

  const selectedSite = sites.find(
    (site) => getDiveSiteValue(site, valueKey) === value,
  );
  const selectedLabel =
    valueLabel ??
    (allOption?.value === value
      ? allOption.label
      : selectedSite
        ? formatDiveSiteOptionLabel(selectedSite)
        : undefined);

  return (
    <LocationCombobox
      id={id}
      value={value}
      valueLabel={selectedLabel}
      options={options}
      onValueChange={(nextValue) => {
        if (!nextValue) {
          onValueChange(allOption?.value ?? "", null);
          return;
        }

        if (allOption?.value === nextValue) {
          onValueChange(nextValue, null);
          return;
        }

        const selectedSite =
          sites.find(
            (site) => getDiveSiteValue(site, valueKey) === nextValue,
          ) ?? null;
        onValueChange(nextValue, selectedSite);
      }}
      inputValue={search}
      onInputValueChange={setSearch}
      searchPlaceholder={searchPlaceholder}
      emptyMessage={query.isPending ? loadingMessage : emptyMessage}
      disabled={disabled}
      showClear={!!value && value !== allOption?.value}
    />
  );
}

function getDiveSiteValue(
  site: ExploreSiteCard,
  valueKey: DiveSiteComboboxValueKey,
) {
  return valueKey === "slug" ? site.slug : site.id;
}

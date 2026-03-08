"use client";

import type { ExploreSiteCard } from "@freediving.ph/types";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import type { ComboboxOption } from "@/components/ui/combobox";
import { LocationCombobox } from "@/features/locations/components/LocationCombobox";
import { exploreApi } from "@/features/diveSpots/api/explore-v1";

type DiveSitePickerProps = {
  value: string;
  valueLabel?: string;
  onValueChange: (site: ExploreSiteCard | null) => void;
  disabled?: boolean;
};

export function DiveSitePicker({
  value,
  valueLabel,
  onValueChange,
  disabled,
}: DiveSitePickerProps) {
  const [search, setSearch] = useState("");
  const query = useQuery({
    queryKey: ["explore", "sites", "picker", search],
    queryFn: () =>
      exploreApi.listSites({
        search: search.trim() || undefined,
        limit: 12,
      }),
    staleTime: 60_000,
  });

  const options: ComboboxOption[] = (query.data?.items ?? []).map((site) => ({
    value: site.id,
    label: `${site.name} · ${site.area}`,
    keywords: [site.slug, site.name, site.area],
  }));

  useEffect(() => {
    if (!value) return;
    const selected = query.data?.items.find((site) => site.id === value);
    if (!selected) return;
    onValueChange(selected);
  }, [onValueChange, query.data?.items, value]);

  return (
    <LocationCombobox
      id="dive-site-id"
      value={value}
      valueLabel={valueLabel}
      options={options}
      onValueChange={(nextValue) => {
        if (!nextValue) {
          onValueChange(null);
          return;
        }
        const selected =
          query.data?.items.find((site) => site.id === nextValue) ?? null;
        onValueChange(selected);
      }}
      inputValue={search}
      onInputValueChange={setSearch}
      searchPlaceholder="Search approved dive sites"
      emptyMessage={
        query.isPending ? "Loading dive sites..." : "No dive sites found"
      }
      disabled={disabled}
    />
  );
}

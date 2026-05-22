"use client";

import type { ExploreSiteCard } from "@freediving.ph/types";

import { DiveSiteCombobox } from "@/features/diveSpots/components/DiveSiteCombobox";

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
  return (
    <DiveSiteCombobox
      id="dive-site-id"
      value={value}
      valueLabel={valueLabel}
      limit={12}
      onValueChange={(_value, site) => onValueChange(site)}
      disabled={disabled}
    />
  );
}

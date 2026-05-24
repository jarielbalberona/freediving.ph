"use client";

import { LocationPicker, type LocationPickerProps } from "./LocationPicker";

export type LocationSearchProps = LocationPickerProps;

// Compatibility wrapper. New consumers should import LocationPicker directly.
export function LocationSearch(props: LocationSearchProps) {
  return <LocationPicker {...props} />;
}

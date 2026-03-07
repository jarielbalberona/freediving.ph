"use client";

export type SiteLocation = {
  lat: number;
  lng: number;
  area?: string;
};

export const defaultMapCenter = { lat: 11.8, lng: 121.4 };

export const hasSelectedLocation = (
  value: SiteLocation | null,
): value is SiteLocation =>
  value !== null && Number.isFinite(value.lat) && Number.isFinite(value.lng);

export const formatPinnedAreaLabel = (value: SiteLocation | null) => {
  if (!value) return "Mark on map";
  if (value.area?.trim()) return `Pinned: ${value.area.trim()}`;
  return "Pinned: resolving location...";
};

export const deriveCoarseAreaFromAddressComponents = (
  components: google.maps.GeocoderAddressComponent[] | undefined,
) => {
  if (!components?.length) return undefined;

  const city =
    findAddressComponent(components, "locality") ??
    findAddressComponent(components, "postal_town") ??
    findAddressComponent(components, "administrative_area_level_2") ??
    findAddressComponent(components, "administrative_area_level_3");
  const province = findAddressComponent(
    components,
    "administrative_area_level_1",
  );

  if (!city || !province) return undefined;
  return `${city}, ${province}`;
};

const findAddressComponent = (
  components: google.maps.GeocoderAddressComponent[],
  type: string,
) =>
  components
    .find((component) => component.types.includes(type))
    ?.long_name?.trim() || undefined;

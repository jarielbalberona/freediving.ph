"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useExploreStore } from "../store/exploreStore";

const toNumber = (value: string | null): number | null => {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const useExploreUrlState = () => {
  const initializedRef = React.useRef(false);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const viewMode = useExploreStore((state) => state.viewMode);
  const filters = useExploreStore((state) => state.filters);
  const map = useExploreStore((state) => state.map);
  const selectedSpotId = useExploreStore((state) => state.selectedSpotId);
  const initialize = useExploreStore((state) => state.initialize);

  React.useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const urlView = params.get("view");
    const urlSearch = params.get("search");
    const urlLocation = params.get("location");
    const urlDifficulty = params.get("difficulty");
    const urlSort = params.get("sort");
    const urlSpotId = toNumber(params.get("spotId"));

    const north = toNumber(params.get("north"));
    const south = toNumber(params.get("south"));
    const east = toNumber(params.get("east"));
    const west = toNumber(params.get("west"));
    const lat = toNumber(params.get("lat"));
    const lng = toNumber(params.get("lng"));
    const zoom = toNumber(params.get("zoom"));

    initialize({
      viewMode: urlView === "map" || urlView === "list" ? urlView : undefined,
      filters: {
        search: urlSearch ?? undefined,
        location: urlLocation ?? undefined,
        difficulty:
          urlDifficulty === "ALL" ||
          urlDifficulty === "BEGINNER" ||
          urlDifficulty === "INTERMEDIATE" ||
          urlDifficulty === "ADVANCED" ||
          urlDifficulty === "EXPERT"
            ? urlDifficulty
            : undefined,
        sort: urlSort === "newest" || urlSort === "oldest" || urlSort === "name" ? urlSort : undefined,
      },
      map: {
        bounds:
          north !== null && south !== null && east !== null && west !== null
            ? { north, south, east, west }
            : undefined,
        center: lat !== null && lng !== null ? { lat, lng } : undefined,
        zoom: zoom ?? undefined,
      },
      selectedSpotId: urlSpotId,
    });
  }, [initialize, params]);

  React.useEffect(() => {
    if (!initializedRef.current) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      const nextParams = new URLSearchParams();
      nextParams.set("view", viewMode);
      if (filters.search.trim()) nextParams.set("search", filters.search.trim());
      if (filters.location.trim()) nextParams.set("location", filters.location.trim());
      if (filters.difficulty !== "ALL") nextParams.set("difficulty", filters.difficulty);
      if (filters.sort !== "newest") nextParams.set("sort", filters.sort);
      if (selectedSpotId) nextParams.set("spotId", String(selectedSpotId));

      nextParams.set("north", map.bounds.north.toFixed(4));
      nextParams.set("south", map.bounds.south.toFixed(4));
      nextParams.set("east", map.bounds.east.toFixed(4));
      nextParams.set("west", map.bounds.west.toFixed(4));
      nextParams.set("lat", map.center.lat.toFixed(4));
      nextParams.set("lng", map.center.lng.toFixed(4));
      nextParams.set("zoom", map.zoom.toFixed(2));

      const nextQueryString = nextParams.toString();
      const currentQueryString = params.toString();
      if (nextQueryString !== currentQueryString) {
        router.replace(`${pathname}?${nextQueryString}`, { scroll: false });
      }
    }, 250);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [filters, map, params, pathname, router, selectedSpotId, viewMode]);
};


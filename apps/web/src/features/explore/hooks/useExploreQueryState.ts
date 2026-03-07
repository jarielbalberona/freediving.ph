"use client";

import { startTransition, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  PHILIPPINES_CENTER,
  PHILIPPINES_ZOOM,
  type ExploreBounds,
  type ExploreCamera,
  type ExploreQueryState,
  type MapViewMode,
} from "../types";

const parseMinRating = (value: string | null): number | null => {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseTags = (value: string | null) =>
  value
    ? value
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
    : [];

const parseBounds = (value: string | null): ExploreBounds | null => {
  if (!value) return null;
  const [neLat, neLng, swLat, swLng] = value.split(",").map(Number);
  if (![neLat, neLng, swLat, swLng].every(Number.isFinite)) return null;
  return {
    ne: { lat: neLat, lng: neLng },
    sw: { lat: swLat, lng: swLng },
  };
};

const parseCamera = (searchParams: URLSearchParams): ExploreCamera => {
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const zoom = Number(searchParams.get("zoom"));
  const hasValidCamera =
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Number.isFinite(zoom) &&
    zoom > 1 &&
    !(Math.abs(lat) < 0.00001 && Math.abs(lng) < 0.00001);

  return {
    center: {
      lat: hasValidCamera ? lat : PHILIPPINES_CENTER.lat,
      lng: hasValidCamera ? lng : PHILIPPINES_CENTER.lng,
    },
    zoom: hasValidCamera ? zoom : PHILIPPINES_ZOOM,
  };
};

const serializeBounds = (bounds: ExploreBounds | null) => {
  if (!bounds) return null;
  return [
    bounds.ne.lat.toFixed(5),
    bounds.ne.lng.toFixed(5),
    bounds.sw.lat.toFixed(5),
    bounds.sw.lng.toFixed(5),
  ].join(",");
};

export const useExploreQueryState = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const state = useMemo<ExploreQueryState>(() => {
    const rawView = searchParams.get("view");
    const view: MapViewMode = rawView === "list" ? "list" : "map";

    return {
      q: searchParams.get("q") ?? "",
      minRating: parseMinRating(searchParams.get("minRating")),
      tags: parseTags(searchParams.get("tags")),
      view,
      bounds: parseBounds(searchParams.get("bounds")),
      camera: parseCamera(searchParams),
      selectedSpotId: searchParams.get("spotId"),
    };
  }, [searchParams]);

  const commitParams = (mutate: (nextParams: URLSearchParams) => void) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    mutate(nextParams);

    startTransition(() => {
      const query = nextParams.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    });
  };

  return {
    state,
    setQuery(q: string) {
      commitParams((nextParams) => {
        if (q.length > 0) nextParams.set("q", q);
        else nextParams.delete("q");
      });
    },
    setMinRating(minRating: number | null) {
      commitParams((nextParams) => {
        if (typeof minRating === "number")
          nextParams.set("minRating", String(minRating));
        else nextParams.delete("minRating");
      });
    },
    toggleTag(tag: string) {
      commitParams((nextParams) => {
        const current = new Set(parseTags(nextParams.get("tags")));
        if (current.has(tag)) current.delete(tag);
        else current.add(tag);

        if (current.size > 0)
          nextParams.set("tags", Array.from(current).join(","));
        else nextParams.delete("tags");
      });
    },
    setView(view: MapViewMode) {
      commitParams((nextParams) => {
        nextParams.set("view", view);
      });
    },
    setBounds(bounds: ExploreBounds | null) {
      commitParams((nextParams) => {
        const serialized = serializeBounds(bounds);
        if (serialized) nextParams.set("bounds", serialized);
        else nextParams.delete("bounds");
      });
    },
    setCamera(camera: ExploreCamera) {
      commitParams((nextParams) => {
        if (
          camera.zoom <= 1 ||
          !Number.isFinite(camera.center.lat) ||
          !Number.isFinite(camera.center.lng) ||
          (Math.abs(camera.center.lat) < 0.00001 &&
            Math.abs(camera.center.lng) < 0.00001)
        ) {
          nextParams.delete("lat");
          nextParams.delete("lng");
          nextParams.delete("zoom");
          return;
        }

        nextParams.set("lat", camera.center.lat.toFixed(5));
        nextParams.set("lng", camera.center.lng.toFixed(5));
        nextParams.set("zoom", camera.zoom.toFixed(2));
      });
    },
    setSelectedSpot(spotId: string | null) {
      commitParams((nextParams) => {
        if (spotId) nextParams.set("spotId", spotId);
        else nextParams.delete("spotId");
      });
    },
    resetFilters() {
      commitParams((nextParams) => {
        nextParams.delete("q");
        nextParams.delete("minRating");
        nextParams.delete("tags");
      });
    },
  };
};

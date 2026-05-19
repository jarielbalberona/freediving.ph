"use client";

import { startTransition, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  type ExploreDifficulty,
  PHILIPPINES_CENTER,
  PHILIPPINES_ZOOM,
  type ExploreBounds,
  type ExploreCamera,
  type ExploreQueryState,
  type MapViewMode,
} from "../types";

const parseDifficulty = (value: string | null): ExploreDifficulty => {
  if (value === "easy" || value === "moderate" || value === "hard") {
    return value;
  }
  return "all";
};

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
      area: searchParams.get("area") ?? "",
      difficulty: parseDifficulty(searchParams.get("difficulty")),
      verifiedOnly: searchParams.get("verifiedOnly") === "true",
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
    setArea(area: string) {
      commitParams((nextParams) => {
        if (area) nextParams.set("area", area);
        else nextParams.delete("area");
      });
    },
    setDifficulty(difficulty: ExploreDifficulty) {
      commitParams((nextParams) => {
        if (difficulty === "all") nextParams.delete("difficulty");
        else nextParams.set("difficulty", difficulty);
      });
    },
    setVerifiedOnly(verifiedOnly: boolean) {
      commitParams((nextParams) => {
        if (verifiedOnly) nextParams.set("verifiedOnly", "true");
        else nextParams.delete("verifiedOnly");
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
        nextParams.delete("area");
        nextParams.delete("difficulty");
        nextParams.delete("verifiedOnly");
      });
    },
  };
};

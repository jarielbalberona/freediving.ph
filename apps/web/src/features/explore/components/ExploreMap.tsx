"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Map, useMap } from "@vis.gl/react-google-maps";
import {
  MarkerClusterer,
  type Marker as ClusterMarker,
  type Renderer,
} from "@googlemaps/markerclusterer";

import type { DiveSpot, ExploreBounds, ExploreCamera } from "../types";
import { PHILIPPINES_CENTER, PHILIPPINES_ZOOM } from "../types";

type ExploreMapProps = {
  spots: DiveSpot[];
  selectedSpotId: string | null;
  searchBounds: ExploreBounds | null;
  initialCamera: ExploreCamera;
  onBoundsChange: (bounds: ExploreBounds) => void;
  onCameraChange: (camera: ExploreCamera) => void;
  onSelectSpot: (spot: DiveSpot) => void;
};

const EXPLORE_GOOGLE_MAP_ID =
  process.env.NEXT_PUBLIC_GOOGLE_MAP_ID ?? "c5170fc5a137d9ea8ef77423";
const EXPLORE_MARKER_ICON_URL =
  "https://cdn.freediving.ph/images/map-marker.png";

const MARKER_ICON_SIZE = {
  default: { width: 40, height: 60 },
  selected: { width: 48, height: 72 },
} as const;

const createMarkerContent = (isSelected: boolean): HTMLDivElement => {
  const size = isSelected ? MARKER_ICON_SIZE.selected : MARKER_ICON_SIZE.default;
  const marker = document.createElement("div");
  marker.style.width = `${size.width}px`;
  marker.style.height = `${size.height}px`;
  marker.style.display = "grid";
  marker.style.placeItems = "center";
  marker.style.filter = isSelected
    ? "drop-shadow(0 0 2px #FFFFFF) drop-shadow(0 0 7px rgb(2 132 199 / 0.58)) drop-shadow(0 10px 18px rgb(8 47 73 / 0.3))"
    : "drop-shadow(0 8px 16px rgb(8 47 73 / 0.28))";
  marker.style.transform = isSelected ? "translateY(-6px)" : "translateY(0)";
  marker.style.transition = "transform 160ms ease, filter 160ms ease";

  const image = document.createElement("img");
  image.src = EXPLORE_MARKER_ICON_URL;
  image.alt = "";
  image.decoding = "async";
  image.style.width = "100%";
  image.style.height = "100%";
  image.style.objectFit = "contain";
  image.style.display = "block";
  image.style.pointerEvents = "none";

  marker.appendChild(image);
  return marker;
};

const removeMarkerContent = (content: Node | null | undefined) => {
  if (content instanceof Element) {
    content.remove();
  }
};

const getClusterIconUrl = (count: number, isLargeCluster: boolean) => {
  const fill = isLargeCluster ? "#0369A1" : "#0284C7";
  const ring = isLargeCluster ? "#7DD3FC" : "#BAE6FD";
  const halo = isLargeCluster ? "#0F766E" : "#06B6D4";

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="30" fill="${halo}" fill-opacity="0.18"/>
      <circle cx="32" cy="32" r="24" fill="${fill}" stroke="${ring}" stroke-width="4"/>
      <circle cx="32" cy="32" r="17" fill="${fill}" fill-opacity="0.92"/>
    </svg>
  `)}`;
};

const exploreClusterRenderer: Renderer = {
  render({ count, position }, stats) {
    const isLargeCluster = count > Math.max(10, stats.clusters.markers.mean);
    const size = isLargeCluster ? 56 : 48;

    const content = document.createElement("div");
    content.style.width = `${size}px`;
    content.style.height = `${size}px`;
    content.style.display = "grid";
    content.style.placeItems = "center";
    content.style.borderRadius = "999px";
    content.style.backgroundImage = `url("${getClusterIconUrl(count, isLargeCluster)}")`;
    content.style.backgroundSize = "contain";
    content.style.backgroundRepeat = "no-repeat";
    content.style.color = "#FFFFFF";
    content.style.fontSize = count >= 100 ? "12px" : "13px";
    content.style.fontWeight = "700";
    content.style.lineHeight = "1";
    content.style.textShadow = "0 1px 2px rgb(8 47 73 / 0.42)";
    content.textContent = String(count);

    return new google.maps.marker.AdvancedMarkerElement({
      position,
      title: `Cluster of ${count} dive sites`,
      content,
      zIndex: 1000 + count,
    });
  },
};

const exploreMapOptions = {
  mapId: EXPLORE_GOOGLE_MAP_ID,
  mapTypeId: "terrain",
} satisfies Pick<google.maps.MapOptions, "mapTypeId"> & { mapId: string };

const toMapBounds = (map: google.maps.Map): ExploreBounds => {
  const bounds = map.getBounds();
  const northEast = bounds?.getNorthEast();
  const southWest = bounds?.getSouthWest();

  return {
    ne: {
      lat: northEast?.lat() ?? PHILIPPINES_CENTER.lat,
      lng: northEast?.lng() ?? PHILIPPINES_CENTER.lng,
    },
    sw: {
      lat: southWest?.lat() ?? PHILIPPINES_CENTER.lat,
      lng: southWest?.lng() ?? PHILIPPINES_CENTER.lng,
    },
  };
};

function ExploreMarkers({
  spots,
  selectedSpotId,
  onSelectSpot,
}: {
  spots: DiveSpot[];
  selectedSpotId: string | null;
  onSelectSpot: (spot: DiveSpot) => void;
}) {
  const map = useMap();
  const [markerLibrary, setMarkerLibrary] =
    useState<google.maps.MarkerLibrary | null>(null);
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const markersRef = useRef(
    new globalThis.Map<string, google.maps.marker.AdvancedMarkerElement>(),
  );
  const spotsWithCoordinates = useMemo(
    () =>
      spots.filter(
        (spot): spot is DiveSpot & { lat: number; lng: number } =>
          typeof spot.lat === "number" && typeof spot.lng === "number",
      ),
    [spots],
  );

  useEffect(() => {
    if (!map || markerLibrary) return;

    let isActive = true;

    void google.maps.importLibrary("marker").then((library) => {
      if (isActive) {
        setMarkerLibrary(library as google.maps.MarkerLibrary);
      }
    });

    return () => {
      isActive = false;
    };
  }, [map, markerLibrary]);

  useEffect(() => {
    if (!map || !markerLibrary || clustererRef.current) return;

    // The clusterer instance is created once and then fed marker updates, which avoids churn while panning.
    clustererRef.current = new MarkerClusterer({
      map,
      renderer: exploreClusterRenderer,
    });
  }, [map, markerLibrary]);

  useEffect(() => {
    if (!map || !markerLibrary || !clustererRef.current) return;

    const nextIds = new Set(spotsWithCoordinates.map((spot) => spot.id));

    for (const [spotId, marker] of markersRef.current.entries()) {
      if (!nextIds.has(spotId)) {
        clustererRef.current.removeMarker(marker);
        marker.map = null;
        removeMarkerContent(marker.content);
        markersRef.current.delete(spotId);
      }
    }

    for (const spot of spotsWithCoordinates) {
      const currentMarker = markersRef.current.get(spot.id);
      const isSelected = spot.id === selectedSpotId;
      const content = createMarkerContent(isSelected);

      if (currentMarker) {
        removeMarkerContent(currentMarker.content);
        currentMarker.content = content;
        currentMarker.zIndex = isSelected ? 100 : 1;
        continue;
      }

      const marker = new markerLibrary.AdvancedMarkerElement({
        position: { lat: spot.lat, lng: spot.lng },
        title: spot.name,
        content,
        zIndex: isSelected ? 100 : 1,
      });

      marker.addListener("click", () => onSelectSpot(spot));
      markersRef.current.set(spot.id, marker);
    }

    clustererRef.current.clearMarkers();
    clustererRef.current.addMarkers(
      Array.from(markersRef.current.values()) as ClusterMarker[],
    );
  }, [map, markerLibrary, onSelectSpot, selectedSpotId, spotsWithCoordinates]);

  useEffect(() => {
    if (!selectedSpotId || !map) return;
    const selectedMarker = markersRef.current.get(selectedSpotId);
    const position = selectedMarker?.position;
    if (!position) return;
    map.panTo(position);
  }, [map, selectedSpotId]);

  return null;
}

function SearchBoundsFollower({
  searchBounds,
}: { searchBounds: ExploreBounds | null }) {
  const map = useMap();
  const boundsKey = useMemo(() => {
    if (!searchBounds) return null;
    return `${searchBounds.ne.lat}:${searchBounds.ne.lng}:${searchBounds.sw.lat}:${searchBounds.sw.lng}`;
  }, [searchBounds]);
  const lastAppliedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!map || !searchBounds || lastAppliedRef.current === boundsKey) return;

    const bounds = new google.maps.LatLngBounds(
      searchBounds.sw,
      searchBounds.ne,
    );
    map.fitBounds(bounds, 48);
    lastAppliedRef.current = boundsKey;
  }, [boundsKey, map, searchBounds]);

  return null;
}

export function ExploreMap({
  spots,
  selectedSpotId,
  searchBounds,
  initialCamera,
  onBoundsChange,
  onCameraChange,
  onSelectSpot,
}: ExploreMapProps) {
  const initialCameraKeyRef = useRef(
    `${initialCamera.center.lat}:${initialCamera.center.lng}:${initialCamera.zoom}`,
  );

  return (
    <div className="h-full min-h-0 w-full">
      <Map
        id="explore-map"
        {...exploreMapOptions}
        key={initialCameraKeyRef.current}
        defaultCenter={initialCamera.center ?? PHILIPPINES_CENTER}
        defaultZoom={initialCamera.zoom ?? PHILIPPINES_ZOOM}
        gestureHandling="greedy"
        disableDefaultUI={false}
        mapTypeControl={false}
        streetViewControl={false}
        fullscreenControl={false}
        clickableIcons={false}
        reuseMaps
        className="h-full w-full"
        onIdle={(event) => {
          const map = event.map;
          if (!map) return;
          onBoundsChange(toMapBounds(map));
          const center = map.getCenter();
          onCameraChange({
            center: {
              lat: center?.lat() ?? PHILIPPINES_CENTER.lat,
              lng: center?.lng() ?? PHILIPPINES_CENTER.lng,
            },
            zoom: map.getZoom() ?? PHILIPPINES_ZOOM,
          });
        }}
      >
        <SearchBoundsFollower searchBounds={searchBounds} />
        <ExploreMarkers
          spots={spots}
          selectedSpotId={selectedSpotId}
          onSelectSpot={onSelectSpot}
        />
      </Map>
    </div>
  );
}

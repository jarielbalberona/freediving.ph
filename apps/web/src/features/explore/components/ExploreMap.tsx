"use client";

import { useEffect, useMemo, useRef } from "react";
import { Map, useMap } from "@vis.gl/react-google-maps";
import { MarkerClusterer, type Renderer } from "@googlemaps/markerclusterer";

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
  default: { width: 40, height: 40 },
  selected: { width: 48, height: 48 },
} as const;

const getMarkerIcon = (isSelected: boolean): google.maps.Icon => {
  return {
    url: EXPLORE_MARKER_ICON_URL,
    scaledSize: isSelected
      ? new google.maps.Size(
          MARKER_ICON_SIZE.selected.width,
          MARKER_ICON_SIZE.selected.height,
        )
      : new google.maps.Size(
          MARKER_ICON_SIZE.default.width,
          MARKER_ICON_SIZE.default.height,
        ),
    anchor: isSelected
      ? new google.maps.Point(
          MARKER_ICON_SIZE.selected.width / 2,
          MARKER_ICON_SIZE.selected.height,
        )
      : new google.maps.Point(
          MARKER_ICON_SIZE.default.width / 2,
          MARKER_ICON_SIZE.default.height,
        ),
  };
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

    return new google.maps.Marker({
      position,
      title: `Cluster of ${count} dive sites`,
      icon: {
        url: getClusterIconUrl(count, isLargeCluster),
        scaledSize: new google.maps.Size(size, size),
        anchor: new google.maps.Point(size / 2, size / 2),
      },
      label: {
        text: String(count),
        color: "#FFFFFF",
        fontSize: count >= 100 ? "12px" : "13px",
        fontWeight: "700",
      },
      zIndex: Number(google.maps.Marker.MAX_ZINDEX) + count,
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
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const markersRef = useRef(new globalThis.Map<string, google.maps.Marker>());
  const spotsWithCoordinates = useMemo(
    () =>
      spots.filter(
        (spot): spot is DiveSpot & { lat: number; lng: number } =>
          typeof spot.lat === "number" && typeof spot.lng === "number",
      ),
    [spots],
  );

  useEffect(() => {
    if (!map || clustererRef.current) return;

    // The clusterer instance is created once and then fed marker updates, which avoids churn while panning.
    clustererRef.current = new MarkerClusterer({
      map,
      renderer: exploreClusterRenderer,
    });
  }, [map]);

  useEffect(() => {
    if (!map || !clustererRef.current) return;

    const nextIds = new Set(spotsWithCoordinates.map((spot) => spot.id));

    for (const [spotId, marker] of markersRef.current.entries()) {
      if (!nextIds.has(spotId)) {
        clustererRef.current.removeMarker(marker);
        marker.setMap(null);
        markersRef.current.delete(spotId);
      }
    }

    for (const spot of spotsWithCoordinates) {
      const currentMarker = markersRef.current.get(spot.id);
      const isSelected = spot.id === selectedSpotId;
      const icon = getMarkerIcon(isSelected);

      if (currentMarker) {
        currentMarker.setIcon(icon);
        currentMarker.setZIndex(isSelected ? 100 : 1);
        continue;
      }

      const marker = new google.maps.Marker({
        position: { lat: spot.lat, lng: spot.lng },
        title: spot.name,
        icon,
        zIndex: isSelected ? 100 : 1,
      });

      marker.addListener("click", () => onSelectSpot(spot));
      markersRef.current.set(spot.id, marker);
    }

    clustererRef.current.clearMarkers();
    clustererRef.current.addMarkers(Array.from(markersRef.current.values()));
  }, [map, onSelectSpot, selectedSpotId, spotsWithCoordinates]);

  useEffect(() => {
    if (!selectedSpotId || !map) return;
    const selectedMarker = markersRef.current.get(selectedSpotId);
    const position = selectedMarker?.getPosition();
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

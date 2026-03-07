"use client";

import { useEffect, useMemo, useRef } from "react";
import { Map, useMap } from "@vis.gl/react-google-maps";
import { MarkerClusterer } from "@googlemaps/markerclusterer";

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

const DEFAULT_MAP_ID = "fph-explore-map";

const markerSvg = (selected: boolean) =>
  `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg width="38" height="50" viewBox="0 0 38 50" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M19 49C17 45 8 33.5 8 24C8 14.6112 13.6112 7 19 7C24.3888 7 30 14.6112 30 24C30 33.5 21 45 19 49Z" fill="${selected ? "#0F766E" : "#2563EB"}"/>
      <circle cx="19" cy="24" r="8.5" fill="${selected ? "#D1FAE5" : "#DBEAFE"}"/>
      <circle cx="19" cy="24" r="4.5" fill="${selected ? "#0F766E" : "#2563EB"}"/>
    </svg>
  `)}`;

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

  useEffect(() => {
    if (!map || clustererRef.current) return;

    // The clusterer instance is created once and then fed marker updates, which avoids churn while panning.
    clustererRef.current = new MarkerClusterer({ map });
  }, [map]);

  useEffect(() => {
    if (!map || !clustererRef.current) return;

    const nextIds = new Set(spots.map((spot) => spot.id));

    for (const [spotId, marker] of markersRef.current.entries()) {
      if (!nextIds.has(spotId)) {
        clustererRef.current.removeMarker(marker);
        marker.setMap(null);
        markersRef.current.delete(spotId);
      }
    }

    for (const spot of spots) {
      const currentMarker = markersRef.current.get(spot.id);
      const icon = {
        url: markerSvg(spot.id === selectedSpotId),
        scaledSize: new google.maps.Size(38, 50),
      };

      if (currentMarker) {
        currentMarker.setIcon(icon);
        currentMarker.setZIndex(spot.id === selectedSpotId ? 10 : 1);
        continue;
      }

      const marker = new google.maps.Marker({
        position: { lat: spot.lat, lng: spot.lng },
        title: spot.name,
        icon,
        zIndex: spot.id === selectedSpotId ? 10 : 1,
      });

      marker.addListener("click", () => onSelectSpot(spot));
      markersRef.current.set(spot.id, marker);
    }

    clustererRef.current.clearMarkers();
    clustererRef.current.addMarkers(Array.from(markersRef.current.values()));
  }, [map, onSelectSpot, selectedSpotId, spots]);

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
        id={DEFAULT_MAP_ID}
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

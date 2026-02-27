"use client";

import { Map, Marker, type MapCameraChangedEvent } from "@vis.gl/react-google-maps";
import * as React from "react";

type DiveSpotMarker = {
  id: number;
  lat?: number | null;
  lng?: number | null;
};

type Bounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};

interface MapComponentProps {
  freedivingSpots: DiveSpotMarker[];
  selectedSpotId: number | null;
  onSpotSelect: (spotId: number) => void;
  onBoundsChange: (bounds: Bounds) => void;
  onCameraStateChange?: (state: { center: { lat: number; lng: number }; zoom: number }) => void;
  center?: { lat: number; lng: number };
  zoom?: number;
}

const defaultMapCenter = { lat: 11.8, lng: 121.4 };

const mapBoundsRestriction = {
  north: 19.0,
  south: 4.5,
  west: 116.0,
  east: 127.0,
};

const toBounds = (event: MapCameraChangedEvent): Bounds | null => {
  const bounds = event.detail.bounds;
  if (!bounds) return null;

  return {
    north: bounds.north,
    south: bounds.south,
    east: bounds.east,
    west: bounds.west,
  };
};

const hasCoordinates = (spot: DiveSpotMarker): spot is DiveSpotMarker & { lat: number; lng: number } =>
  typeof spot.lat === "number" && typeof spot.lng === "number";

type ClusterNode = {
  lat: number;
  lng: number;
  spotIds: number[];
};

const toWorld = (lat: number, lng: number, zoom: number) => {
  const scale = 256 * 2 ** zoom;
  const sinLat = Math.sin((lat * Math.PI) / 180);
  const x = ((lng + 180) / 360) * scale;
  const y = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale;
  return { x, y };
};

const clusterSpots = (spots: Array<DiveSpotMarker & { lat: number; lng: number }>, zoom: number): ClusterNode[] => {
  const gridSize = zoom >= 11 ? 42 : zoom >= 9 ? 54 : zoom >= 8 ? 64 : 72;
  const buckets = new globalThis.Map<string, ClusterNode>();

  for (const spot of spots) {
    const world = toWorld(spot.lat, spot.lng, zoom);
    const key = `${Math.floor(world.x / gridSize)}:${Math.floor(world.y / gridSize)}`;
    const existing = buckets.get(key);
    if (!existing) {
      buckets.set(key, {
        lat: spot.lat,
        lng: spot.lng,
        spotIds: [spot.id],
      });
      continue;
    }
    const nextCount = existing.spotIds.length + 1;
    existing.lat = (existing.lat * existing.spotIds.length + spot.lat) / nextCount;
    existing.lng = (existing.lng * existing.spotIds.length + spot.lng) / nextCount;
    existing.spotIds.push(spot.id);
  }

  return Array.from(buckets.values());
};

const MapComponent = ({
  freedivingSpots,
  selectedSpotId,
  onSpotSelect,
  onBoundsChange,
  onCameraStateChange,
  center,
  zoom,
}: MapComponentProps) => (
  <MapRenderer
    freedivingSpots={freedivingSpots}
    selectedSpotId={selectedSpotId}
    onSpotSelect={onSpotSelect}
    onBoundsChange={onBoundsChange}
    onCameraStateChange={onCameraStateChange}
    center={center}
    zoom={zoom}
  />
);

const MapRenderer = ({
  freedivingSpots,
  selectedSpotId,
  onSpotSelect,
  onBoundsChange,
  onCameraStateChange,
  center,
  zoom,
}: MapComponentProps) => {
  const resolvedCenter = center ?? defaultMapCenter;
  const resolvedZoom = zoom ?? 6.4;

  const clusteredSpots = React.useMemo(() => {
    const spots = freedivingSpots.filter(hasCoordinates);
    return clusterSpots(spots, Math.max(resolvedZoom, 6));
  }, [freedivingSpots, resolvedZoom]);

  return (
    <div className="h-full w-full">
      <Map
        defaultCenter={resolvedCenter}
        defaultZoom={resolvedZoom}
        center={resolvedCenter}
        zoom={resolvedZoom}
        minZoom={6.2}
        gestureHandling="greedy"
        disableDefaultUI={false}
        mapTypeControl={false}
        restriction={{ latLngBounds: mapBoundsRestriction }}
        className="h-full w-full rounded-l-2xl"
        onCameraChanged={(event) => {
          const bounds = toBounds(event);
          if (bounds) onBoundsChange(bounds);

          if (
            onCameraStateChange &&
            typeof event.detail.center?.lat === "number" &&
            typeof event.detail.center?.lng === "number" &&
            typeof event.detail.zoom === "number"
          ) {
            onCameraStateChange({
              center: {
                lat: event.detail.center.lat,
                lng: event.detail.center.lng,
              },
              zoom: event.detail.zoom,
            });
          }
        }}
      >
        {clusteredSpots.map((cluster, index) => {
          const primarySpotId = cluster.spotIds[0];
          const isSingle = cluster.spotIds.length === 1;
          const isSelected = selectedSpotId !== null && cluster.spotIds.includes(selectedSpotId);
          return (
          <Marker
            key={`${index}-${primarySpotId}`}
            position={{ lat: cluster.lat, lng: cluster.lng }}
            onClick={() => {
              if (isSingle) {
                onSpotSelect(primarySpotId);
                return;
              }
              onCameraStateChange?.({
                center: { lat: cluster.lat, lng: cluster.lng },
                zoom: Math.min(resolvedZoom + 1.2, 14),
              });
            }}
            zIndex={isSelected ? 3 : isSingle ? 2 : 1}
            label={isSelected ? "★" : isSingle ? undefined : String(cluster.spotIds.length)}
          />
          );
        })}
      </Map>
    </div>
  );
};

export { MapComponent };

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

const getMarkerLimit = (zoom: number) => {
  if (zoom < 7) return 80;
  if (zoom < 8) return 150;
  if (zoom < 9) return 300;
  return 600;
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

  const renderableSpots = React.useMemo(() => {
    const spots = freedivingSpots.filter(hasCoordinates);
    const markerLimit = getMarkerLimit(resolvedZoom);
    if (spots.length <= markerLimit) return spots;

    const step = Math.max(Math.ceil(spots.length / markerLimit), 1);
    const sampled = spots.filter((_, index) => index % step === 0);
    if (selectedSpotId && !sampled.some((spot) => spot.id === selectedSpotId)) {
      const selected = spots.find((spot) => spot.id === selectedSpotId);
      if (selected) sampled.unshift(selected);
    }
    return sampled.slice(0, markerLimit);
  }, [freedivingSpots, resolvedZoom, selectedSpotId]);

  return (
    <div className="h-full w-full">
      <Map
        defaultCenter={resolvedCenter}
        defaultZoom={resolvedZoom}
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
        {renderableSpots.map((spot) => (
          <Marker
            key={spot.id}
            position={{ lat: spot.lat, lng: spot.lng }}
            onClick={() => onSpotSelect(spot.id)}
            zIndex={spot.id === selectedSpotId ? 3 : 1}
            label={spot.id === selectedSpotId ? "★" : undefined}
          />
        ))}
      </Map>
    </div>
  );
};

export { MapComponent };

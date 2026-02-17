"use client";

import { Map, Marker, type MapCameraChangedEvent } from "@vis.gl/react-google-maps";

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

const MapComponent = ({
  freedivingSpots,
  selectedSpotId,
  onSpotSelect,
  onBoundsChange,
}: MapComponentProps) => (
  <div className="h-full w-full">
    <Map
      defaultCenter={defaultMapCenter}
      defaultZoom={6.4}
      minZoom={6.2}
      gestureHandling="greedy"
      disableDefaultUI={false}
      mapTypeControl={false}
      restriction={{ latLngBounds: mapBoundsRestriction }}
      className="h-full w-full rounded-l-2xl"
      onCameraChanged={(event) => {
        const bounds = toBounds(event);
        if (bounds) onBoundsChange(bounds);
      }}
    >
      {freedivingSpots.filter(hasCoordinates).map((spot) => (
        <Marker
          key={spot.id}
          position={{ lat: spot.lat, lng: spot.lng }}
          onClick={() => onSpotSelect(spot.id)}
          zIndex={spot.id === selectedSpotId ? 2 : 1}
        />
      ))}
    </Map>
  </div>
);

export { MapComponent };

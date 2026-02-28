declare module "@vis.gl/react-google-maps" {
  import type { ReactNode } from "react";

  export type MapEvent = {
    map: google.maps.Map | null;
  };

  export type MapCameraChangedEvent = {
    detail: {
      bounds?: {
        north: number;
        south: number;
        east: number;
        west: number;
      };
      center?: {
        lat: number;
        lng: number;
      };
      zoom?: number;
    };
  };

  export type MapMouseEvent = {
    detail: {
      latLng: { lat: number; lng: number } | null;
      placeId: string | null;
    };
    stop: () => void;
  };

  export function APIProvider(props: {
    apiKey: string;
    children?: ReactNode;
  }): JSX.Element;

  export function Map(props: {
    children?: ReactNode;
    id?: string;
    className?: string;
    defaultCenter?: { lat: number; lng: number };
    defaultZoom?: number;
    center?: { lat: number; lng: number };
    zoom?: number;
    minZoom?: number;
    gestureHandling?: string;
    disableDefaultUI?: boolean;
    mapTypeControl?: boolean;
    streetViewControl?: boolean;
    fullscreenControl?: boolean;
    clickableIcons?: boolean;
    reuseMaps?: boolean;
    restriction?: {
      latLngBounds: {
        north: number;
        south: number;
        east: number;
        west: number;
      };
    };
    onCameraChanged?: (event: MapCameraChangedEvent) => void;
    onClick?: (event: MapMouseEvent) => void;
    onIdle?: (event: MapEvent) => void;
  }): JSX.Element;

  export function Marker(props: {
    position: { lat: number; lng: number };
    draggable?: boolean;
    onClick?: () => void;
    onDragEnd?: (event: google.maps.MapMouseEvent) => void;
    zIndex?: number;
    label?: string;
  }): JSX.Element;

  export function InfoWindow(props: {
    children?: ReactNode;
    position?: { lat: number; lng: number };
    pixelOffset?: [number, number];
  }): JSX.Element;

  export function useMap(id?: string | null): google.maps.Map | null;
  export function useMapsLibrary(name: "geocoding"): google.maps.GeocodingLibrary | null;
}

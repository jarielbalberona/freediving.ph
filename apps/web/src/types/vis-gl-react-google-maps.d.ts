declare module "@vis.gl/react-google-maps" {
  import type { ReactNode } from "react";

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

  export function APIProvider(props: { apiKey: string; children?: ReactNode }): JSX.Element;

  export function Map(props: {
    children?: ReactNode;
    className?: string;
    defaultCenter?: { lat: number; lng: number };
    defaultZoom?: number;
    center?: { lat: number; lng: number };
    zoom?: number;
    minZoom?: number;
    gestureHandling?: string;
    disableDefaultUI?: boolean;
    mapTypeControl?: boolean;
    restriction?: { latLngBounds: { north: number; south: number; east: number; west: number } };
    onCameraChanged?: (event: MapCameraChangedEvent) => void;
  }): JSX.Element;

  export function Marker(props: {
    position: { lat: number; lng: number };
    onClick?: () => void;
    zIndex?: number;
    label?: string;
  }): JSX.Element;
}

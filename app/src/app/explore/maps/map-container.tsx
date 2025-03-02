"use client";
import  { useState, useEffect } from "react";
import { GoogleMap, Marker, MarkerClusterer } from "@react-google-maps/api";
import CustomMarker from "./marker"

export const defaultMapContainerStyle = {
  width: "100%",
  height: "100vh",
  borderRadius: "15px 0px 0px 15px",
};

const defaultMapCenter = {
  lat: 11.8,
  lng: 121.4,
};
const defaultMapZoom = 6.4;

const defaultMapOptions = {
  zoomControl: true,
  tilt: 0,
  gestureHandling: "auto",
  mapTypeId: "roadmap",
  mapTypeControl: false, // Hides the Map/Satellite option
  minZoom: 6.2, // Prevent zooming out below 6.4
  restriction: {
    latLngBounds: {
      north: 19.0, // Northernmost point of PH
      south: 4.5,  // Southernmost point of PH
      west: 116.0, // Westernmost point of PH
      east: 127.0, // Easternmost point of PH
    },
  },
};

const MapComponent = ({ freedivingSpots = [] }: { freedivingSpots: any}) => {

  return (
    <div className="w-full">
      <GoogleMap
        mapContainerStyle={defaultMapContainerStyle}
        center={defaultMapCenter}
        zoom={defaultMapZoom}
        options={defaultMapOptions}

      >
        <MarkerClusterer>
          {(clusterer) =>
            freedivingSpots?.map((loc: any, index: any) => (
              <CustomMarker
                key={index}
                position={loc}
                clusterer={clusterer}
              />
            )) as any
          }
        </MarkerClusterer>
      </GoogleMap>
    </div>
  );
};

export { MapComponent };

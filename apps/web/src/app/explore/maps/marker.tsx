import React from "react";
import { Marker } from "@react-google-maps/api";

export default function CustomMarker(props:any) {
  const { position, clusterer } = props;

  return <Marker position={position} clusterer={clusterer} />;
}

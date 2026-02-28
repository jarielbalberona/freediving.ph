"use client";

import { List, Map } from "lucide-react";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import type { MapViewMode } from "../types";

type ExploreMobileToggleProps = {
  view: MapViewMode;
  onChange: (view: MapViewMode) => void;
};

export function ExploreMobileToggle({
  view,
  onChange,
}: ExploreMobileToggleProps) {
  return (
    <div className="pointer-events-auto">
      <ToggleGroup
        value={[view]}
        onValueChange={(nextValue) =>
          onChange((nextValue[0] ?? view) as MapViewMode)
        }
        className="grid grid-cols-2 gap-1 rounded-full bg-white/95 p-1 shadow-2xl"
      >
        <ToggleGroupItem value="map" aria-label="Map view">
          <Map className="mr-2 size-4" />
          Map View
        </ToggleGroupItem>
        <ToggleGroupItem value="list" aria-label="List view">
          <List className="mr-2 size-4" />
          List View
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}

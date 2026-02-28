"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Map,
  Marker,
  useMapsLibrary,
  type MapMouseEvent,
} from "@vis.gl/react-google-maps";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MapProvider } from "@/providers/map-provider";

import {
  defaultMapCenter,
  deriveCoarseAreaFromAddressComponents,
  formatPinnedAreaLabel,
  type SiteLocation,
} from "./location-utils";

const resolvedAreaCache = new globalThis.Map<string, string | null>();

type MapPinPickerDialogProps = {
  open: boolean;
  value: SiteLocation | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (value: SiteLocation) => void;
};

export function MapPinPickerDialog({
  open,
  value,
  onOpenChange,
  onConfirm,
}: MapPinPickerDialogProps) {
  const [draftLocation, setDraftLocation] = useState<SiteLocation | null>(
    value,
  );

  useEffect(() => {
    if (open) {
      setDraftLocation(value);
    }
  }, [open, value]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="h-dvh max-h-none max-w-none rounded-none border-0 p-0 sm:h-dvh"
      >
        <DialogHeader className="border-b border-sky-950/10 bg-white/95 pb-4">
          <DialogTitle className="text-2xl font-semibold text-sky-950">
            Pin the dive site
          </DialogTitle>
          <DialogDescription>
            Drop one map pin. We only keep a coarse area, not an exact street
            address.
          </DialogDescription>
        </DialogHeader>

        <div className="relative min-h-0 flex-1 bg-sky-950/5">
          <MapProvider>
            <PickerMap value={draftLocation} onChange={setDraftLocation} />
          </MapProvider>
        </div>

        <DialogFooter className="border-t border-sky-950/10 bg-white/95 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-zinc-600">
            {formatPinnedAreaLabel(draftLocation)}
          </div>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!draftLocation) return;
                onConfirm(draftLocation);
                onOpenChange(false);
              }}
              disabled={!draftLocation}
            >
              Confirm pin
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type PickerMapProps = {
  value: SiteLocation | null;
  onChange: (value: SiteLocation | null) => void;
};

function PickerMap({ value, onChange }: PickerMapProps) {
  const geocodingLib = useMapsLibrary("geocoding");
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const [displayArea, setDisplayArea] = useState<string | undefined>(
    value?.area,
  );

  useEffect(() => {
    if (!geocodingLib) return;
    geocoderRef.current = new geocodingLib.Geocoder();
  }, [geocodingLib]);

  useEffect(() => {
    if (!value) {
      setDisplayArea(undefined);
      return;
    }

    if (value.area?.trim()) {
      setDisplayArea(value.area.trim());
      return;
    }

    const cacheKey = `${value.lat.toFixed(5)},${value.lng.toFixed(5)}`;
    const cached = resolvedAreaCache.get(cacheKey);
    if (cached !== undefined) {
      setDisplayArea(cached ?? undefined);
      if (cached) onChange({ ...value, area: cached });
      return;
    }

    if (!geocoderRef.current) return;

    let cancelled = false;
    setDisplayArea(undefined);

    void geocoderRef.current
      .geocode({ location: { lat: value.lat, lng: value.lng } })
      .then((response) => {
        if (cancelled) return;
        const area = response.results
          .map((result) =>
            deriveCoarseAreaFromAddressComponents(result.address_components),
          )
          .find(Boolean);

        resolvedAreaCache.set(cacheKey, area ?? null);
        if (!area) return;
        setDisplayArea(area);
        onChange({ ...value, area });
      })
      .catch(() => {
        resolvedAreaCache.set(cacheKey, null);
      });

    return () => {
      cancelled = true;
    };
  }, [geocoderRef, onChange, value]);

  const center = useMemo(
    () => (value ? { lat: value.lat, lng: value.lng } : defaultMapCenter),
    [value],
  );

  return (
    <div className="h-full">
      <Map
        defaultCenter={center}
        defaultZoom={value ? 10.5 : 6.2}
        center={center}
        gestureHandling="greedy"
        mapTypeControl={false}
        fullscreenControl={false}
        streetViewControl={false}
        className="h-full w-full"
        onClick={(event) => {
          if (!event.detail.latLng) return;
          onChange({
            lat: event.detail.latLng.lat,
            lng: event.detail.latLng.lng,
          });
        }}
      >
        {value ? (
          <Marker
            position={{ lat: value.lat, lng: value.lng }}
            draggable
            onDragEnd={(event: MapMouseEvent | google.maps.MapMouseEvent) => {
              const latLng =
                "detail" in event
                  ? event.detail.latLng
                  : event.latLng?.toJSON();
              if (!latLng) return;
              onChange({
                lat: latLng.lat,
                lng: latLng.lng,
              });
            }}
          />
        ) : null}
      </Map>

      <div className="pointer-events-none absolute inset-x-4 bottom-4 rounded-3xl bg-white/92 p-4 shadow-lg backdrop-blur">
        <p className="text-sm font-medium text-sky-950">
          {displayArea
            ? `Pinned area: ${displayArea}`
            : "Click the map to drop a pin"}
        </p>
        <p className="mt-1 text-xs text-zinc-600">
          {value
            ? `Lat ${value.lat.toFixed(5)}  Lng ${value.lng.toFixed(5)}`
            : "Drag the pin if you need to adjust it."}
        </p>
      </div>
    </div>
  );
}

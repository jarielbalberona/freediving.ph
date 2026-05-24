"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AdvancedMarker,
  Map,
  useMapsLibrary,
  type MapMouseEvent,
} from "@vis.gl/react-google-maps";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { MapProvider } from "@/providers/map-provider";

import {
  defaultMapCenter,
  deriveCoarseAreaFromAddressComponents,
  formatPinnedAreaLabel,
  type SiteLocation,
} from "./location-utils";

const resolvedAreaCache = new globalThis.Map<string, string | null>();
const SUBMIT_GOOGLE_MAP_ID =
  process.env.NEXT_PUBLIC_GOOGLE_MAP_ID ?? "c5170fc5a137d9ea8ef77423";

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
        containerClassName="p-0 sm:p-4"
        className="flex! h-dvh w-dvw max-w-none! flex-col gap-0 overflow-hidden rounded-none border-0 p-0 sm:h-[min(860px,calc(100dvh-2rem))] sm:w-[min(1120px,calc(100vw-2rem))] sm:rounded-3xl sm:border"
      >
        <DialogHeader className="shrink-0 border-b border-sky-950/10 bg-card/95 px-5 py-4 sm:px-6">
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

        <DialogFooter className="shrink-0 border-t border-sky-950/10 bg-card/95 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
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
  const mapRef = useRef<google.maps.Map | null>(null);
  const [displayArea, setDisplayArea] = useState<string | undefined>(
    value?.area,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    google.maps.GeocoderResult[]
  >([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const searchReady = Boolean(geocodingLib);

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

  const initialCenter = useMemo(
    () => (value ? { lat: value.lat, lng: value.lng } : defaultMapCenter),
    [value],
  );

  const searchForLocation = async () => {
    const query = searchQuery.trim();
    if (!query || !geocodingLib) return;
    if (!geocoderRef.current) {
      geocoderRef.current = new geocodingLib.Geocoder();
    }

    setSearchLoading(true);
    setSearchError(null);
    setSearchResults([]);

    try {
      const response = await geocoderRef.current.geocode({
        address: query,
        componentRestrictions: { country: "PH" },
      });
      const results = response.results.filter((result) =>
        Boolean(result.geometry?.location),
      );
      setSearchResults(results.slice(0, 5));
      if (results.length === 0) {
        setSearchError("No matching places found in the Philippines.");
      }
    } catch {
      setSearchError("Could not search the map right now.");
    } finally {
      setSearchLoading(false);
    }
  };

  const selectSearchResult = (result: google.maps.GeocoderResult) => {
    const latLng = result.geometry?.location?.toJSON();
    if (!latLng) return;

    const area = deriveCoarseAreaFromAddressComponents(
      result.address_components,
    );
    onChange({
      lat: latLng.lat,
      lng: latLng.lng,
      area,
    });
    setDisplayArea(area);
    setSearchQuery(result.formatted_address);
    setSearchResults([]);
    setSearchError(null);

    mapRef.current?.panTo(latLng);
    mapRef.current?.setZoom(13);
  };

  return (
    <div className="relative h-full min-h-0">
      <Map
        defaultCenter={initialCenter}
        defaultZoom={value ? 10.5 : 6.2}
        mapId={SUBMIT_GOOGLE_MAP_ID}
        gestureHandling="greedy"
        mapTypeControl={false}
        fullscreenControl={false}
        streetViewControl={false}
        className="h-full w-full"
        onIdle={(event) => {
          if (event.map) mapRef.current = event.map;
        }}
        onClick={(event) => {
          if (!event.detail.latLng) return;
          onChange({
            lat: event.detail.latLng.lat,
            lng: event.detail.latLng.lng,
          });
        }}
      >
        {value ? (
          <AdvancedMarker
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

      <div className="pointer-events-auto absolute inset-x-4 top-4 z-10 max-w-xl rounded-3xl bg-card/95 p-3 shadow-lg backdrop-blur sm:left-5 sm:right-auto sm:w-[min(520px,calc(100vw-3rem))]">
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void searchForLocation();
          }}
        >
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search for a place or area"
            disabled={!searchReady || searchLoading}
          />
          <Button
            type="submit"
            disabled={!searchQuery.trim() || !searchReady || searchLoading}
          >
            <Search className="size-4" />
            Search
          </Button>
        </form>
        <p className="mt-2 text-xs text-zinc-600">
          Choose a result to move the pin. You can still drag the pin after.
        </p>
        {searchError ? (
          <p className="mt-2 text-sm text-destructive">{searchError}</p>
        ) : null}
        {searchResults.length > 0 ? (
          <div className="mt-3 max-h-56 overflow-y-auto rounded-2xl border border-border/70 bg-background p-1">
            {searchResults.map((result) => (
              <button
                key={result.place_id || result.formatted_address}
                type="button"
                className="block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-muted focus:bg-muted focus:outline-none"
                onClick={() => selectSearchResult(result)}
              >
                <span className="line-clamp-2">{result.formatted_address}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="pointer-events-none absolute inset-x-4 bottom-4 rounded-3xl bg-card/92 p-4 shadow-lg backdrop-blur">
        <p className="text-sm font-medium text-sky-950">
          {displayArea
            ? `Pinned area: ${displayArea}`
            : "Click the map to drop a pin"}
        </p>
        <p className="mt-1 text-xs text-zinc-600">
          Drag the pin if you need to adjust it.
        </p>
      </div>
    </div>
  );
}

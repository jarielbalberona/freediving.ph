"use client";

import type {
  ProfileDiveMapMarker,
  ProfileDiveMapResponse,
} from "@freediving.ph/types";
import { Map, useMap } from "@vis.gl/react-google-maps";
import { HeartHandshake, MapPinned } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  PHILIPPINES_CENTER,
  PHILIPPINES_MIN_ZOOM,
  PHILIPPINES_PADDED_BOUNDS,
  PHILIPPINES_ZOOM,
} from "@/features/explore/types";
import { ProfileTabHeader } from "@/features/profile/components/ProfileTabHeader";
import { useProfileDiveMapQuery } from "@/features/profile/hooks/queries";
import { MapProvider } from "@/providers/map-provider";

type ProfileDiveMapProps = {
  username: string;
  isOwner: boolean;
};

const PROFILE_MAP_ID =
  process.env.NEXT_PUBLIC_GOOGLE_MAP_ID ?? "c5170fc5a137d9ea8ef77423";
const PROFILE_MAP_MARKER_ICON_URL =
  "https://cdn.freediving.ph/images/map-marker.png";
const PROFILE_MAPS_API_KEY =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
  process.env.NEXT_PUBLIC_GOOGLE_MAP_API;
const PROFILE_MAP_HEIGHT_CLASS =
  "h-[min(68svh,620px)] min-h-[460px] lg:h-[680px]";
const MARKER_ICON_SIZE = {
  default: { width: 40, height: 60 },
  selected: { width: 48, height: 72 },
} as const;

export function ProfileDiveMap({ username, isOwner }: ProfileDiveMapProps) {
  const mapQuery = useProfileDiveMapQuery(username);
  const markers = mapQuery.data?.markers ?? [];
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const mobileListId = useId();
  const selectedID =
    selectedSiteId && markers.some((marker) => marker.diveSiteId === selectedSiteId)
      ? selectedSiteId
      : (markers[0]?.diveSiteId ?? null);

  useEffect(() => {
    if (!selectedID || typeof window === "undefined") return;
    if (!window.matchMedia("(max-width: 1023px)").matches) return;

    const list = document.getElementById(mobileListId);
    if (!(list instanceof HTMLElement)) return;
    const selectedItem = list.querySelector<HTMLElement>(
      `[data-dive-site-id="${selectedID}"]`,
    );
    if (!selectedItem) return;

    selectedItem.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [mobileListId, selectedID]);

  if (mapQuery.isPending && !mapQuery.data) {
    return <StatusCard text="Loading Dive Map" />;
  }

  if (mapQuery.isError) {
    return <StatusCard text="Dive Map is unavailable." />;
  }

  if (markers.length === 0) {
    return (
      <section className="space-y-3">
        <ProfileTabHeader
          title="Dive Memories"
          subtitle="Visited sites with location-scoped memories."
          icon={<HeartHandshake className="h-4 w-4" />}
          action={
            <Badge variant="outline" className="h-6 px-2 text-xs">
              {formatVisitedCount(mapQuery.data)}
            </Badge>
          }
        />
        <EmptyDiveMapState
          title={
            isOwner
              ? "No post-backed dive sites yet."
              : "No visible Dive Map sites yet."
          }
        />
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <ProfileTabHeader
        title="Dive Memories"
        subtitle="Visited sites with location-scoped memories."
        icon={<HeartHandshake className="h-4 w-4" />}
        action={
          <Badge variant="outline" className="h-6 px-2 text-xs">
            {formatVisitedCount(mapQuery.data)}
          </Badge>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,30%)_minmax(0,70%)]">
        <DiveSiteList
          username={username}
          isOwner={isOwner}
          markers={markers}
          selectedSiteId={selectedID}
          onSelectSite={setSelectedSiteId}
          className="hidden lg:flex"
          layout="sidebar"
        />
        <div className="relative">
          <ProfileDiveMapVisual
            markers={markers}
            selectedSiteId={selectedID}
            onSelectSite={setSelectedSiteId}
          />
          <DiveSiteList
            username={username}
            isOwner={isOwner}
            markers={markers}
            selectedSiteId={selectedID}
            onSelectSite={setSelectedSiteId}
            id={mobileListId}
            className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-3 pb-3 lg:hidden"
            layout="overlay"
          />
        </div>
      </div>
    </section>
  );
}

function ProfileDiveMapVisual({
  markers,
  selectedSiteId,
  onSelectSite,
}: {
  markers: ProfileDiveMapMarker[];
  selectedSiteId: string | null;
  onSelectSite: (siteId: string) => void;
}) {
  const markersWithCoordinates = markers.filter(hasCoordinates);
  const selectedMarker =
    markersWithCoordinates.find(
      (marker) => marker.diveSiteId === selectedSiteId,
    ) ?? markersWithCoordinates[0];
  const center = selectedMarker
    ? { lat: selectedMarker.latitude, lng: selectedMarker.longitude }
    : PHILIPPINES_CENTER;

  if (!PROFILE_MAPS_API_KEY) {
    return (
      <MapStatusPanel
        title="Map temporarily unavailable"
        description="The visited-site list still works. Add a Google Maps browser key to restore the visual map."
      />
    );
  }

  if (markersWithCoordinates.length === 0) {
    return (
      <MapStatusPanel
        title="Map coordinates unavailable"
        description="The proof-backed visited-site list still works. Coordinates can be added to dive sites later without changing Dive Map ownership."
      />
    );
  }

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-border/70 bg-muted/30 ${PROFILE_MAP_HEIGHT_CLASS}`}
    >
      <MapProvider>
        <Map
          id="profile-dive-map"
          mapId={PROFILE_MAP_ID}
          mapTypeId="terrain"
          defaultCenter={center}
          defaultZoom={PHILIPPINES_ZOOM}
          minZoom={PHILIPPINES_MIN_ZOOM}
          gestureHandling="greedy"
          disableDefaultUI={false}
          mapTypeControl={false}
          streetViewControl={false}
          fullscreenControl={false}
          clickableIcons={false}
          restriction={{
            latLngBounds: PHILIPPINES_PADDED_BOUNDS,
            strictBounds: false,
          }}
          reuseMaps
          className="h-full w-full"
        >
          <ProfileMapMarkers
            markers={markersWithCoordinates}
            selectedSiteId={selectedSiteId}
            onSelectSite={onSelectSite}
          />
        </Map>
      </MapProvider>
    </div>
  );
}

function ProfileMapMarkers({
  markers,
  selectedSiteId,
  onSelectSite,
}: {
  markers: Array<
    ProfileDiveMapMarker & { latitude: number; longitude: number }
  >;
  selectedSiteId: string | null;
  onSelectSite: (siteId: string) => void;
}) {
  const map = useMap();
  const [markerLibrary, setMarkerLibrary] =
    useState<google.maps.MarkerLibrary | null>(null);
  const markersRef = useRef(
    new globalThis.Map<string, google.maps.marker.AdvancedMarkerElement>(),
  );

  useEffect(() => {
    if (!map || markerLibrary) return;
    let isActive = true;

    void google.maps.importLibrary("marker").then((library) => {
      if (isActive) {
        setMarkerLibrary(library as google.maps.MarkerLibrary);
      }
    });

    return () => {
      isActive = false;
    };
  }, [map, markerLibrary]);

  useEffect(() => {
    if (!map || !markerLibrary) return;
    const nextIds = new Set(markers.map((marker) => marker.diveSiteId));

    for (const [siteId, marker] of markersRef.current.entries()) {
      if (!nextIds.has(siteId)) {
        marker.map = null;
        removeMarkerContent(marker.content);
        markersRef.current.delete(siteId);
      }
    }

    for (const marker of markers) {
      const active = marker.diveSiteId === selectedSiteId;
      const content = createMarkerContent(active);
      const currentMarker = markersRef.current.get(marker.diveSiteId);

      if (currentMarker) {
        removeMarkerContent(currentMarker.content);
        currentMarker.content = content;
        currentMarker.position = {
          lat: marker.latitude,
          lng: marker.longitude,
        };
        currentMarker.zIndex = active ? 100 : 1;
        continue;
      }

      const nextMarker = new markerLibrary.AdvancedMarkerElement({
        map,
        position: { lat: marker.latitude, lng: marker.longitude },
        title: marker.diveSiteName,
        content,
        gmpClickable: true,
        zIndex: active ? 100 : 1,
      });

      nextMarker.addEventListener("gmp-click", () =>
        onSelectSite(marker.diveSiteId),
      );
      markersRef.current.set(marker.diveSiteId, nextMarker);
    }
  }, [map, markerLibrary, markers, onSelectSite, selectedSiteId]);

  useEffect(() => {
    if (!map || !selectedSiteId) return;
    const selectedMarker = markers.find(
      (marker) => marker.diveSiteId === selectedSiteId,
    );
    if (!selectedMarker) return;
    map.panTo({ lat: selectedMarker.latitude, lng: selectedMarker.longitude });
  }, [map, markers, selectedSiteId]);

  useEffect(() => {
    return () => {
      for (const marker of markersRef.current.values()) {
        marker.map = null;
        removeMarkerContent(marker.content);
      }
      markersRef.current.clear();
    };
  }, []);

  return null;
}

function DiveSiteList({
  id,
  username,
  isOwner,
  markers,
  selectedSiteId,
  onSelectSite,
  className,
  layout,
}: {
  id?: string;
  username: string;
  isOwner: boolean;
  markers: ProfileDiveMapMarker[];
  selectedSiteId: string | null;
  onSelectSite: (siteId: string) => void;
  className?: string;
  layout: "sidebar" | "overlay";
}) {
  const isOverlay = layout === "overlay";

  return (
    <div
      id={id}
      className={[
        className,
        isOverlay
          ? "absolute"
          : "max-h-[680px] min-h-0 flex-col overflow-y-auto",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div
        className={[
          isOverlay
            ? "pointer-events-auto flex w-full max-w-full gap-2 overflow-x-auto rounded-2xl bg-background/80 p-2 shadow-lg backdrop-blur"
            : "flex flex-col gap-1.5 px-2 py-2",
        ].join(" ")}
      >
        {markers.map((marker) => {
          const active = marker.diveSiteId === selectedSiteId;
          return (
            <div
              key={marker.diveSiteId}
              data-dive-site-id={marker.diveSiteId}
              className={[
                isOverlay
                  ? "w-[280px] shrink-0 rounded-lg border bg-background/95 px-3 py-2.5 text-left shadow-sm"
                  : "rounded-lg px-2.5 py-2 text-left transition",
                active
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "border-transparent hover:border-primary/50 hover:bg-muted/35",
              ].join(" ")}
            >
              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-2 gap-y-1">
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => onSelectSite(marker.diveSiteId)}
                  className="min-w-0 text-left"
                >
                  <p className="line-clamp-1 text-sm font-semibold text-foreground">
                    {marker.diveSiteName}
                  </p>
                  <p className="line-clamp-1 text-xs text-muted-foreground">
                    {marker.diveSiteArea}
                  </p>
                </button>
                <div className="flex flex-col items-end">
                  <Button
                    size="xs"
                    variant={active ? "default" : "outline"}
                    render={
                      <Link
                        href={`/dive-memories/${marker.diveSiteSlug}/${username}`}
                      />
                    }
                  >
                    View Memories
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function hasCoordinates(
  marker: ProfileDiveMapMarker,
): marker is ProfileDiveMapMarker & { latitude: number; longitude: number } {
  return (
    typeof marker.latitude === "number" &&
    Number.isFinite(marker.latitude) &&
    typeof marker.longitude === "number" &&
    Number.isFinite(marker.longitude)
  );
}

function createMarkerContent(
  isSelected: boolean,
): HTMLDivElement {
  const size = isSelected ? MARKER_ICON_SIZE.selected : MARKER_ICON_SIZE.default;
  const marker = document.createElement("div");
  marker.style.width = `${size.width}px`;
  marker.style.height = `${size.height}px`;
  marker.style.display = "grid";
  marker.style.placeItems = "center";
  marker.style.filter = isSelected
    ? "drop-shadow(0 0 2px #FFFFFF) drop-shadow(0 0 7px rgb(2 132 199 / 0.58)) drop-shadow(0 10px 18px rgb(8 47 73 / 0.3))"
    : "drop-shadow(0 8px 16px rgb(8 47 73 / 0.28))";
  marker.style.transform = isSelected ? "translateY(-6px)" : "translateY(0)";
  marker.style.transition = "transform 160ms ease, filter 160ms ease";

  const image = document.createElement("img");
  image.src = PROFILE_MAP_MARKER_ICON_URL;
  image.alt = "";
  image.decoding = "async";
  image.style.width = "100%";
  image.style.height = "100%";
  image.style.objectFit = "contain";
  image.style.display = "block";
  image.style.pointerEvents = "none";

  marker.appendChild(image);
  return marker;
}

function removeMarkerContent(content: Node | null | undefined) {
  if (content instanceof Element) {
    content.remove();
  }
}

function EmptyDiveMapState({ title }: { title: string }) {
  return (
    <section className="space-y-3">
      <div className="rounded-xl border border-dashed border-border/70 bg-background/55 px-4 py-4">
        <p className="text-sm font-semibold text-foreground">{title}</p>
      </div>
    </section>
  );
}

function MapStatusPanel({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div
      className={`flex items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/30 p-4 text-center ${PROFILE_MAP_HEIGHT_CLASS}`}
    >
      <div className="max-w-sm space-y-2">
        <MapPinned className="mx-auto h-5 w-5 text-muted-foreground" />
        <p className="font-medium text-sm">{title}</p>
        <p className="text-muted-foreground text-xs leading-5">{description}</p>
      </div>
    </div>
  );
}

function StatusCard({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border/70 bg-background/55 px-4 py-3 text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function formatVisitedCount(data?: ProfileDiveMapResponse) {
  const count = data?.visitedSiteCount ?? 0;
  return `${count} ${count === 1 ? "site" : "sites"} visited`;
}

function formatShortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

"use client";

import type {
  ProfileDiveMapMarker,
  ProfileDiveMapResponse,
} from "@freediving.ph/types";
import { Map, useMap } from "@vis.gl/react-google-maps";
import { ImageIcon, MapPinned } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import {
  useProfileDiveMapQuery,
  useProfileDiveMapSiteQuery,
} from "@/features/profile/hooks/queries";
import { MapProvider } from "@/providers/map-provider";

type ProfileDiveMapProps = {
  username: string;
  isOwner: boolean;
};

const PROFILE_MAP_ID =
  process.env.NEXT_PUBLIC_GOOGLE_MAP_ID ?? "c5170fc5a137d9ea8ef77423";
const PHILIPPINES_CENTER = { lat: 12.8797, lng: 121.774 };
const PROFILE_MAP_ZOOM = 5;

export function ProfileDiveMap({ username, isOwner }: ProfileDiveMapProps) {
  const mapQuery = useProfileDiveMapQuery(username);
  const markers = mapQuery.data?.markers ?? [];
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const selectedMarker = useMemo(() => {
    if (selectedSiteId) {
      return markers.find((marker) => marker.diveSiteId === selectedSiteId);
    }
    return markers[0];
  }, [markers, selectedSiteId]);
  const selectedID = selectedMarker?.diveSiteId ?? null;
  const detailQuery = useProfileDiveMapSiteQuery(username, selectedID, Boolean(selectedID));

  if (mapQuery.isPending && !mapQuery.data) {
    return <StatusCard text="Loading Dive Map" />;
  }

  if (mapQuery.isError) {
    return <StatusCard text="Dive Map is unavailable." />;
  }

  if (markers.length === 0) {
    return (
      <EmptyDiveMapState
        title={isOwner ? "No proof-backed dive sites yet." : "No visible Dive Map sites yet."}
      />
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-base font-semibold">
          <MapPinned className="h-4 w-4" />
          <h2>Dive Map</h2>
        </div>
        <Badge variant="outline" className="h-6 px-2 text-xs">
          {formatVisitedCount(mapQuery.data)}
        </Badge>
      </div>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(300px,360px)]">
        <div className="space-y-3">
          <ProfileDiveMapVisual
            markers={markers}
            selectedSiteId={selectedID}
            onSelectSite={setSelectedSiteId}
          />
          <MarkerCards
            markers={markers}
            selectedSiteId={selectedID}
            onSelectSite={setSelectedSiteId}
          />
        </div>
        <DiveMapSiteDetail
          marker={selectedMarker}
          isLoading={detailQuery.isPending}
          isError={detailQuery.isError}
          media={detailQuery.data?.media ?? []}
          memories={detailQuery.data?.memories ?? []}
        />
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
    markersWithCoordinates.find((marker) => marker.diveSiteId === selectedSiteId) ??
    markersWithCoordinates[0];
  const center = selectedMarker
    ? { lat: selectedMarker.latitude, lng: selectedMarker.longitude }
    : PHILIPPINES_CENTER;

  if (markersWithCoordinates.length === 0) {
    return (
      <div className="flex min-h-[300px] items-center justify-center rounded-xl border border-border/70 bg-muted/30 p-4 text-center">
        <div className="max-w-sm space-y-2">
          <MapPinned className="mx-auto h-5 w-5 text-muted-foreground" />
          <p className="font-medium text-sm">Map coordinates unavailable</p>
          <p className="text-muted-foreground text-xs leading-5">
            The proof-backed sites are still listed below. Coordinates can be added
            to dive sites later without changing Dive Map ownership.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[320px] overflow-hidden rounded-xl border border-border/70 bg-muted/30">
      <MapProvider>
        <Map
          id="profile-dive-map"
          mapId={PROFILE_MAP_ID}
          defaultCenter={center}
          defaultZoom={PROFILE_MAP_ZOOM}
          gestureHandling="greedy"
          disableDefaultUI={false}
          mapTypeControl={false}
          streetViewControl={false}
          fullscreenControl={false}
          clickableIcons={false}
          reuseMaps
          className="h-[320px] w-full"
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
      const content = createMarkerContent(active, marker.mediaPostCount);
      const currentMarker = markersRef.current.get(marker.diveSiteId);

      if (currentMarker) {
        removeMarkerContent(currentMarker.content);
        currentMarker.content = content;
        currentMarker.position = { lat: marker.latitude, lng: marker.longitude };
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

      nextMarker.addEventListener("gmp-click", () => onSelectSite(marker.diveSiteId));
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

function MarkerCards({
  markers,
  selectedSiteId,
  onSelectSite,
}: {
  markers: ProfileDiveMapMarker[];
  selectedSiteId: string | null;
  onSelectSite: (siteId: string) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {markers.map((marker) => {
        const active = marker.diveSiteId === selectedSiteId;
        return (
          <button
            key={marker.diveSiteId}
            type="button"
            aria-pressed={active}
            onClick={() => onSelectSite(marker.diveSiteId)}
            className={[
              "min-h-24 rounded-lg border bg-background p-3 text-left transition",
              active
                ? "border-primary shadow-sm"
                : "border-border/70 hover:border-primary/60",
            ].join(" ")}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="line-clamp-1 text-sm font-semibold text-foreground">
                  {marker.diveSiteName}
                </p>
                <p className="line-clamp-1 text-xs text-muted-foreground">
                  {marker.diveSiteArea}
                </p>
              </div>
              <Badge className="h-5 px-2 text-[11px]">
                {marker.mediaPostCount}
              </Badge>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Last proof {formatShortDate(marker.lastVisitedAt)}
            </p>
          </button>
        );
      })}
    </div>
  );
}

function DiveMapSiteDetail({
  marker,
  isLoading,
  isError,
  media,
  memories,
}: {
  marker?: ProfileDiveMapMarker;
  isLoading: boolean;
  isError: boolean;
  media: NonNullable<ReturnType<typeof useProfileDiveMapSiteQuery>["data"]>["media"];
  memories: NonNullable<ReturnType<typeof useProfileDiveMapSiteQuery>["data"]>["memories"];
}) {
  if (!marker) return null;

  return (
    <aside className="rounded-xl border border-border/70 bg-background p-4">
      <div className="space-y-1">
        <Link
          href={`/explore/sites/${marker.diveSiteSlug}`}
          className="line-clamp-1 text-sm font-semibold hover:underline"
        >
          {marker.diveSiteName}
        </Link>
        <p className="line-clamp-1 text-xs text-muted-foreground">
          {marker.diveSiteArea}
        </p>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge variant="outline" className="h-5 px-2 text-[11px]">
          {marker.mediaPostCount} proof {marker.mediaPostCount === 1 ? "post" : "posts"}
        </Badge>
        <Badge variant="outline" className="h-5 px-2 text-[11px]">
          {formatShortDate(marker.firstVisitedAt)}
        </Badge>
      </div>
      <div className="mt-4 space-y-2">
        {isLoading ? (
          <StatusCard text="Loading proof media" />
        ) : isError ? (
          <StatusCard text="Proof media is not visible." />
        ) : media.length > 0 ? (
          media.slice(0, 4).map((item) => (
            <div
              key={item.mediaItemId}
              className="flex items-center gap-3 rounded-lg border border-border/70 p-2"
            >
              <div className="flex size-12 shrink-0 items-center justify-center rounded-md bg-muted">
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="line-clamp-1 text-xs font-medium">
                  {item.caption || `${titleCase(item.type)} proof`}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {formatShortDate(item.createdAt)}
                </p>
              </div>
            </div>
          ))
        ) : (
          <StatusCard text="No visible proof media." />
        )}
      </div>
      {memories.length > 0 ? (
        <div className="mt-4 border-t border-border/70 pt-3">
          <p className="mb-2 text-xs font-semibold text-muted-foreground">
            Memories
          </p>
          <div className="space-y-2">
            {memories.slice(0, 3).map((memory) => (
              <div key={memory.id} className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="line-clamp-1 text-xs font-medium">{memory.title}</p>
                  <Badge variant="outline" className="h-5 px-2 text-[11px]">
                    {memory.visibility}
                  </Badge>
                </div>
                {memory.body ? (
                  <p className="line-clamp-2 text-[11px] text-muted-foreground">
                    {memory.body}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </aside>
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

function createMarkerContent(isSelected: boolean, count: number): HTMLDivElement {
  const marker = document.createElement("div");
  marker.style.width = isSelected ? "42px" : "34px";
  marker.style.height = isSelected ? "42px" : "34px";
  marker.style.display = "grid";
  marker.style.placeItems = "center";
  marker.style.borderRadius = "999px";
  marker.style.background = isSelected ? "#0284C7" : "#0F766E";
  marker.style.border = "3px solid #FFFFFF";
  marker.style.color = "#FFFFFF";
  marker.style.fontSize = "12px";
  marker.style.fontWeight = "700";
  marker.style.boxShadow = isSelected
    ? "0 12px 24px rgb(8 47 73 / 0.32)"
    : "0 8px 18px rgb(8 47 73 / 0.24)";
  marker.textContent = String(count);
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
      <div className="flex items-center gap-2 text-base font-semibold">
        <MapPinned className="h-4 w-4" />
        <h2>Dive Map</h2>
      </div>
      <div className="rounded-xl border border-dashed border-border/70 bg-background/55 px-4 py-4">
        <p className="text-sm font-semibold text-foreground">{title}</p>
      </div>
    </section>
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

function titleCase(value: string) {
  return value
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

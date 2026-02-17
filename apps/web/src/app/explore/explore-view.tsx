"use client";

import * as React from "react";
import { Compass, Info, Layers, List, MapIcon, Menu } from "lucide-react";
import type { DiveSpot, DiveSpotFilters } from "@freediving.ph/types";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { MapProvider } from "@/providers/map-provider";
import { useDiveSpotsListQuery, useDiveSpotsMapQuery, useExploreUrlState } from "@/features/diveSpots";
import { diveSpotsApi } from "@/features/diveSpots/api/diveSpots";
import { useExploreStore } from "@/features/diveSpots/store/exploreStore";

import { DiveSpotsContainer, DiveSpotsContainerMobile } from "./dive-spots-container";
import DiveSpotDetailSheet from "./dive-spot-detail-sheet";
import { MapComponent } from "./maps/map-container";

const useDebouncedValue = <T,>(value: T, delay = 300) => {
  const [debounced, setDebounced] = React.useState(value);

  React.useEffect(() => {
    const timeoutId = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timeoutId);
  }, [delay, value]);

  return debounced;
};

const toDifficultyFilter = (difficulty: string): DiveSpotFilters["difficulty"] | undefined => {
  if (difficulty === "BEGINNER" || difficulty === "INTERMEDIATE" || difficulty === "ADVANCED" || difficulty === "EXPERT") {
    return difficulty;
  }
  return undefined;
};

export default function ExploreView() {
  useExploreUrlState();
  const queryClient = useQueryClient();

  const [placesOpen, setPlacesOpen] = React.useState(true);

  const viewMode = useExploreStore((state) => state.viewMode);
  const filters = useExploreStore((state) => state.filters);
  const map = useExploreStore((state) => state.map);
  const selectedSpotId = useExploreStore((state) => state.selectedSpotId);
  const setViewMode = useExploreStore((state) => state.setViewMode);
  const setFilters = useExploreStore((state) => state.setFilters);
  const setMapState = useExploreStore((state) => state.setMapState);
  const setSelectedSpotId = useExploreStore((state) => state.setSelectedSpotId);

  const debouncedBounds = useDebouncedValue(map.bounds, 350);

  const mapQueryFilters = React.useMemo<DiveSpotFilters>(
    () => ({
      shape: "map",
      limit: 500,
      offset: 0,
      search: filters.search.trim() || undefined,
      location: filters.location.trim() || undefined,
      difficulty: toDifficultyFilter(filters.difficulty),
      north: debouncedBounds.north,
      south: debouncedBounds.south,
      east: debouncedBounds.east,
      west: debouncedBounds.west,
      sort: filters.sort,
    }),
    [debouncedBounds, filters],
  );

  const listQueryFilters = React.useMemo<DiveSpotFilters>(
    () => ({
      shape: "list",
      limit: 100,
      offset: 0,
      search: filters.search.trim() || undefined,
      location: filters.location.trim() || undefined,
      difficulty: toDifficultyFilter(filters.difficulty),
      sort: filters.sort,
    }),
    [filters],
  );

  const {
    data: mapDiveSpots = [],
    isLoading: isMapLoading,
    isError: isMapError,
    refetch: refetchMap,
  } = useDiveSpotsMapQuery(mapQueryFilters, viewMode === "map");

  const {
    data: listDiveSpots = [],
    isLoading: isListLoading,
    isError: isListError,
    refetch: refetchList,
  } = useDiveSpotsListQuery(listQueryFilters, viewMode === "list");

  const activeSpots = viewMode === "map" ? mapDiveSpots : listDiveSpots;

  const selectedSpot = React.useMemo(
    () => activeSpots.find((spot) => spot.id === selectedSpotId) ?? null,
    [activeSpots, selectedSpotId],
  );

  const handleSelectSpot = React.useCallback(
    (spotId: number | null) => {
      if (spotId) {
        void queryClient.prefetchQuery({
          queryKey: ["dive-spot", spotId],
          queryFn: () => diveSpotsApi.getDiveSpotById(spotId),
        });
      }
      setSelectedSpotId(spotId);
    },
    [queryClient, setSelectedSpotId],
  );

  const togglePlaces = () => setPlacesOpen((current) => !current);

  const sharedContainerProps = {
    search: filters.search,
    setSearch: (value: string) => setFilters({ search: value }),
    location: filters.location,
    setLocation: (value: string) => setFilters({ location: value }),
    difficulty: filters.difficulty,
    setDifficulty: (value: string) => setFilters({ difficulty: value as typeof filters.difficulty }),
    sort: filters.sort,
    setSort: (value: "newest" | "oldest" | "name") => setFilters({ sort: value }),
    selectedPlace: selectedSpotId,
    setSelectedPlace: handleSelectSpot,
  };

  const activeLoading = viewMode === "map" ? isMapLoading : isListLoading;
  const activeError = viewMode === "map" ? isMapError : isListError;

  return (
    <MapProvider>
      <div className="relative flex h-[calc(100vh-4rem)] w-full flex-col overflow-hidden bg-background">
        <div className="flex items-center justify-between border-b px-4 py-2">
          <div className="space-y-0.5">
            <h1 className="text-xl font-semibold">Explore Dive Spots</h1>
            <p className="text-xs text-muted-foreground">Map and list views stay synced using URL state.</p>
          </div>

          <div className="inline-flex rounded-md border p-1">
            <Button
              size="sm"
              variant={viewMode === "map" ? "default" : "ghost"}
              className="gap-1"
              onClick={() => setViewMode("map")}
            >
              <MapIcon className="h-4 w-4" />
              Map
            </Button>
            <Button
              size="sm"
              variant={viewMode === "list" ? "default" : "ghost"}
              className="gap-1"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
              List
            </Button>
          </div>
        </div>

        {viewMode === "map" ? (
          <div className="relative flex flex-1 overflow-hidden">
            <div
              className={`relative hidden h-full flex-col border-r px-2 transition-all duration-300 md:flex ${
                placesOpen ? "w-full md:w-[400px]" : "w-0"
              }`}
            >
              {placesOpen && (
                <DiveSpotsContainer
                  diveSpots={mapDiveSpots}
                  togglePlaces={togglePlaces}
                  isLoading={isMapLoading}
                  errorMessage={isMapError ? "Unable to load map dive spots." : null}
                  onRetry={() => {
                    void refetchMap();
                  }}
                  {...sharedContainerProps}
                />
              )}
            </div>

            <div className="relative flex-1">
              <div className="h-full w-full bg-muted">
                <MapComponent
                  freedivingSpots={mapDiveSpots}
                  selectedSpotId={selectedSpotId}
                  onSpotSelect={(spotId) => handleSelectSpot(spotId)}
                  onBoundsChange={(bounds) => setMapState({ bounds })}
                  onCameraStateChange={(camera) =>
                    setMapState({
                      center: camera.center,
                      zoom: camera.zoom,
                    })
                  }
                  center={map.center}
                  zoom={map.zoom}
                />
              </div>

              {selectedSpot && (
                <button
                  type="button"
                  className="absolute bottom-4 left-4 max-w-[320px] rounded-lg border bg-background p-3 text-left shadow-lg"
                  onClick={() => handleSelectSpot(selectedSpot.id)}
                >
                  <p className="text-sm font-semibold">{selectedSpot.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedSpot.locationName ?? "Unknown location"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Rating {selectedSpot.avgRating?.toFixed(1) ?? "0.0"} ({selectedSpot.ratingCount ?? 0})
                  </p>
                  <p className="mt-1 text-xs font-medium text-primary">Open details</p>
                </button>
              )}

              <div className="absolute bottom-6 right-6 hidden flex-col gap-2">
                <Button variant="secondary" size="icon" className="rounded-full shadow-md">
                  <Compass className="h-5 w-5" />
                </Button>
                <Button variant="secondary" size="icon" className="rounded-full shadow-md">
                  <Layers className="h-5 w-5" />
                </Button>
                <Button variant="secondary" size="icon" className="rounded-full shadow-md">
                  <Info className="h-5 w-5" />
                </Button>
              </div>

              {!placesOpen && (
                <Button variant="secondary" className="absolute left-4 top-4 hidden gap-2 md:flex" onClick={togglePlaces}>
                  <Menu className="h-5 w-5" />
                  <span>Places</span>
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-4xl flex-1 overflow-auto px-4 py-4">
            <DiveSpotsContainer
              diveSpots={listDiveSpots}
              togglePlaces={undefined}
              isLoading={isListLoading}
              errorMessage={isListError ? "Unable to load list dive spots." : null}
              onRetry={() => {
                void refetchList();
              }}
              {...sharedContainerProps}
            />
          </div>
        )}

        <DiveSpotsContainerMobile
          diveSpots={activeSpots}
          isLoading={activeLoading}
          errorMessage={activeError ? "Unable to load dive spots." : null}
          onRetry={() => {
            if (viewMode === "map") {
              void refetchMap();
              return;
            }
            void refetchList();
          }}
          {...sharedContainerProps}
        />

        <DiveSpotDetailSheet
          spotId={selectedSpotId}
          open={selectedSpotId !== null}
          onOpenChange={(open) => {
            if (!open) setSelectedSpotId(null);
          }}
        />
      </div>
    </MapProvider>
  );
}

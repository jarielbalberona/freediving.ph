"use client";
import { MapProvider } from "@/providers/map-provider";
import * as React from "react";
import { Compass, Info, Layers, Menu } from "lucide-react";
import { useDiveSpots } from "@/features/diveSpots";
import { Button } from "@/components/ui/button";
import { MapComponent } from "./maps/map-container"
import {
  DiveSpotsContainerMobile,
  DiveSpotsContainer,
} from "./dive-spots-container";
import type { DiveSpotFilters } from "@freediving.ph/types";

type Bounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};

const DEFAULT_BOUNDS: Bounds = {
  north: 19,
  south: 4.5,
  east: 127,
  west: 116,
};

export default function Explore() {
  const [placesOpen, setPlacesOpen] = React.useState(true);
  const [selectedPlace, setSelectedPlace] = React.useState<number | null>(null);
  const [search, setSearch] = React.useState("");
  const [difficulty, setDifficulty] = React.useState("ALL");
  const [sort, setSort] = React.useState<"newest" | "oldest" | "name">("newest");
  const [bounds, setBounds] = React.useState<Bounds>(DEFAULT_BOUNDS);

  const filters = React.useMemo<DiveSpotFilters>(() => ({
    limit: 100,
    offset: 0,
    search: search.trim() || undefined,
    difficulty: difficulty === "ALL" ? undefined : (difficulty as DiveSpotFilters["difficulty"]),
    north: bounds.north,
    south: bounds.south,
    east: bounds.east,
    west: bounds.west,
    sort,
  }), [bounds, difficulty, search, sort]);

  const { data: diveSpots = [] } = useDiveSpots(filters);

  React.useEffect(() => {
    if (!selectedPlace && diveSpots.length > 0) {
      setSelectedPlace(diveSpots[0]?.id ?? null);
    }
  }, [diveSpots, selectedPlace]);

  const handleBoundsChange = React.useMemo(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    return (nextBounds: Bounds) => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => setBounds(nextBounds), 300);
    };
  }, []);

  const togglePlaces = () => {
    setPlacesOpen(!placesOpen);
  };

  return (
    <MapProvider>
      <div className="relative flex h-[calc(100vh-4rem)] w-full flex-col overflow-hidden bg-background">
        <div className="relative flex flex-1 overflow-hidden">
          <div
            className={`relative hidden px-2 md:flex h-full flex-col border-r transition-all duration-300 ${
              placesOpen ? "w-full md:w-[400px]" : "w-0"
            }`}
          >
            {placesOpen && (
              <DiveSpotsContainer
                diveSpots={diveSpots}
                search={search}
                setSearch={setSearch}
                difficulty={difficulty}
                setDifficulty={setDifficulty}
                sort={sort}
                setSort={setSort}
                selectedPlace={selectedPlace}
                setSelectedPlace={setSelectedPlace}
                togglePlaces={togglePlaces}
              />
            )}
          </div>

          <div className="relative flex-1">
            <div className="h-full w-full bg-muted">
              <MapComponent
                freedivingSpots={diveSpots}
                selectedSpotId={selectedPlace}
                onSpotSelect={setSelectedPlace}
                onBoundsChange={handleBoundsChange}
              />
            </div>

            <div className="absolute flex flex-col hidden gap-2 bottom-6 right-6">
              <Button
                variant="secondary"
                size="icon"
                className="rounded-full shadow-md"
              >
                <Compass className="w-5 h-5" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="rounded-full shadow-md"
              >
                <Layers className="w-5 h-5" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="rounded-full shadow-md"
              >
                <Info className="w-5 h-5" />
              </Button>
            </div>

            {!placesOpen && (
              <Button
                variant="secondary"
                className="absolute hidden gap-2 left-4 top-4 md:flex"
                onClick={togglePlaces}
              >
                <Menu className="w-5 h-5" />
                <span>Places</span>
              </Button>
            )}
          </div>
        </div>
        <DiveSpotsContainerMobile
          diveSpots={diveSpots}
          search={search}
          setSearch={setSearch}
          difficulty={difficulty}
          setDifficulty={setDifficulty}
          sort={sort}
          setSort={setSort}
          selectedPlace={selectedPlace}
          setSelectedPlace={setSelectedPlace}
        />
      </div>
    </MapProvider>
  );
}

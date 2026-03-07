import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, ChevronLeft } from "lucide-react";
import DiveSpotCard from "./dive-spot-card";
import Filters from "./filters";
import type { DiveSpot } from "@freediving.ph/types";

type SetSort = (value: "newest" | "oldest" | "name") => void;

type ContainerProps = {
  diveSpots: DiveSpot[];
  search: string;
  setSearch: (value: string) => void;
  difficulty: string;
  setDifficulty: (value: string) => void;
  location?: string;
  setLocation?: (value: string) => void;
  sort: "newest" | "oldest" | "name";
  setSort: SetSort;
  selectedPlace: number | null;
  setSelectedPlace: (id: number | null) => void;
  isLoading?: boolean;
  errorMessage?: string | null;
  onRetry?: () => void;
};

const DiveSpotListContent = ({
  diveSpots,
  selectedPlace,
  setSelectedPlace,
  isLoading,
  errorMessage,
  onRetry,
}: Pick<ContainerProps, "diveSpots" | "selectedPlace" | "setSelectedPlace" | "isLoading" | "errorMessage" | "onRetry">) => {
  if (isLoading) {
    return <div className="px-1 py-4 text-sm text-muted-foreground">Loading dive spots...</div>;
  }

  if (errorMessage) {
    return (
      <div className="space-y-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
        <p className="text-destructive">{errorMessage}</p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Retry
          </Button>
        )}
      </div>
    );
  }

  if (diveSpots.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
        No dive spots found for the current filters.
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {diveSpots.map((diveSpot) => (
        <DiveSpotCard
          key={diveSpot.id}
          diveSpot={diveSpot}
          selectedPlace={selectedPlace}
          setSelectedPlace={setSelectedPlace}
        />
      ))}
    </div>
  );
};

export function DiveSpotsContainer({
  diveSpots,
  search,
  setSearch,
  location,
  setLocation,
  difficulty,
  setDifficulty,
  sort,
  setSort,
  selectedPlace,
  setSelectedPlace,
  togglePlaces,
  isLoading,
  errorMessage,
  onRetry,
}: ContainerProps & { togglePlaces?: () => void }) {
  return (
    <>
      <Filters
        search={search}
        onSearchChange={setSearch}
        location={location}
        onLocationChange={setLocation}
        difficulty={difficulty}
        onDifficultyChange={setDifficulty}
        sort={sort}
        onSortChange={setSort}
      />
      <div className="flex-1 overflow-y-auto">
        <DiveSpotListContent
          diveSpots={diveSpots}
          selectedPlace={selectedPlace}
          setSelectedPlace={setSelectedPlace}
          isLoading={isLoading}
          errorMessage={errorMessage}
          onRetry={onRetry}
        />
      </div>

      {/* Places toggle button (visible on desktop) */}
      {typeof togglePlaces === "function" && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute hidden -translate-y-1/2 rounded-full -right-10 top-1/2 bg-background md:flex"
          onClick={togglePlaces}
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
      )}
    </>
  );
}
export function DiveSpotsContainerMobile({
  diveSpots,
  search,
  setSearch,
  location,
  setLocation,
  difficulty,
  setDifficulty,
  sort,
  setSort,
  selectedPlace,
  setSelectedPlace,
  isLoading,
  errorMessage,
  onRetry,
}: ContainerProps) {
  const [panelHeight, setPanelHeight] = useState<"min" | "mid" | "max">("min");
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setCurrentY(e.touches[0].clientY);
  };

  const handleTouchEnd = () => {
    const diff = startY - currentY;
    if (diff > 50) {
      setPanelHeight(panelHeight === "min" ? "mid" : "max");
    } else if (diff < -50) {
      setPanelHeight(panelHeight === "max" ? "mid" : "min");
    }
    setStartY(0);
    setCurrentY(0);
  };

  const getPanelHeight = () => {
    switch (panelHeight) {
      case "min":
        return "h-32";
      case "mid":
        return "h-1/2";
      case "max":
        return "h-full";
      default:
        return "h-32";
    }
  };

  return (
    <>
      <div
        className={`fixed bottom-0 left-0 right-0 z-10 bg-background transition-all duration-300 ease-in-out md:hidden ${getPanelHeight()}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex items-center justify-center p-2">
          <div className="w-16 h-1 bg-border rounded-full"></div>
        </div>
        <div className="flex items-center justify-between p-2 border-b">
          <h2 className="text-lg font-semibold">Places</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setPanelHeight(panelHeight === "max" ? "min" : "max")
            }
          >
            {panelHeight === "max" ? (
              <ChevronDown className="w-5 h-5" />
            ) : (
              <ChevronUp className="w-5 h-5" />
            )}
          </Button>
        </div>
        <div className="h-full px-2 pb-2 mt-3 overflow-y-auto">
          <Filters
            search={search}
            onSearchChange={setSearch}
            location={location}
            onLocationChange={setLocation}
            difficulty={difficulty}
            onDifficultyChange={setDifficulty}
            sort={sort}
            onSortChange={setSort}
          />
          <DiveSpotListContent
            diveSpots={diveSpots}
            selectedPlace={selectedPlace}
            setSelectedPlace={setSelectedPlace}
            isLoading={isLoading}
            errorMessage={errorMessage}
            onRetry={onRetry}
          />
        </div>
      </div>
    </>
  );
}

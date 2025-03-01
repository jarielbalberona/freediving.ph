import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, ChevronLeft, Search } from "lucide-react";
import DiveSpotCard from "./dive-spot-card";
import Filters from "./filters";

export function DiveSpotsContainer({
  diveSpots,
  selectedPlace,
  setSelectedPlace,
  togglePlaces,
}: any) {
  return (
    <>
      <Filters />
      <div className="flex-1 overflow-y-auto">
        <div className="grid gap-3">
          {diveSpots?.map((diveSpot: any) => (
            <DiveSpotCard
              key={diveSpot.id}
              diveSpot={diveSpot}
              selectedPlace={selectedPlace}
              setSelectedPlace={setSelectedPlace}
            />
          ))}
        </div>
      </div>

      {/* Places toggle button (visible on desktop) */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute hidden -translate-y-1/2 rounded-full -right-10 top-1/2 bg-background md:flex"
        onClick={togglePlaces}
      >
        <ChevronLeft className="w-5 h-5" />
      </Button>
    </>
  );
}
export function DiveSpotsContainerMobile({
  diveSpots,
  selectedPlace,
  setSelectedPlace,
}: any) {
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
          <div className="w-16 h-1 bg-gray-300 rounded-full"></div>
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
          <Filters />
          <div className="grid gap-3">
            {diveSpots?.map((diveSpot: any) => (
              <DiveSpotCard
                key={diveSpot.id}
                diveSpot={diveSpot}
                selectedPlace={selectedPlace}
                setSelectedPlace={setSelectedPlace}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

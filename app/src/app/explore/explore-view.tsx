"use client";
import { MapProvider } from "@/providers/map-provider";
import Image from "next/image";
import * as React from "react";
import { Compass, Info, Layers, Menu } from "lucide-react";
import { useDiveSpots } from "@/hooks/react-queries/dives"
import { Button } from "@/components/ui/button";

import {
  DiveSpotsContainerMobile,
  DiveSpotsContainer,
} from "./dive-spots-container";


export default function Explore({ initialDiveSpots }: any) {
  const { data: diveSpots }: any = useDiveSpots(initialDiveSpots);
  const [placesOpen, setPlacesOpen] = React.useState(true);
  const [selectedPlace, setSelectedPlace] = React.useState<string | null>(null);
  console.log("diveSpots", diveSpots);

  // Sample place data
  const places = [
    {
      id: "1",
      name: "Central Park",
      rating: 4.8,
      reviews: 15243,
      type: "Park",
      address: "New York, NY 10022",
      image: "/placeholder.svg?height=120&width=240",
      distance: "1.2 miles away",
    },
  ];

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
                selectedPlace={selectedPlace}
                setSelectedPlace={setSelectedPlace}
                togglePlaces={togglePlaces}
              />
            )}
          </div>

          <div className="relative flex-1">
            <div className="h-full w-full bg-[#e5e3df]">
              <Image
                src="https://images.unsplash.com/photo-1740600379671-46903506e162"
                alt="Map"
                className="object-cover w-full h-full"
              />
            </div>

            <div className="absolute flex flex-col gap-2 bottom-6 right-6">
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
          places={places}
          selectedPlace={selectedPlace}
          setSelectedPlace={setSelectedPlace}
        />
      </div>
    </MapProvider>
  );
}

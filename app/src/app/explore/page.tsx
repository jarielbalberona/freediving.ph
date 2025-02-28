"use client";

import * as React from "react";
import {
  ChevronDown,
  ChevronUp,
  Compass,
  Info,
  Layers,
  Menu,
  Search,
  Star,
  ChevronLeft,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function MapPage() {
  const [placesOpen, setPlacesOpen] = React.useState(true);
  const [selectedPlace, setSelectedPlace] = React.useState<string | null>(null);
  const [panelHeight, setPanelHeight] = React.useState<"min" | "mid" | "max">(
    "min"
  );
  const [startY, setStartY] = React.useState(0);
  const [currentY, setCurrentY] = React.useState(0);

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
    {
      id: "2",
      name: "Empire State Building",
      rating: 4.7,
      reviews: 25631,
      type: "Tourist Attraction",
      address: "20 W 34th St, New York, NY 10001",
      image: "/placeholder.svg?height=120&width=240",
      distance: "0.8 miles away",
    },
    {
      id: "3",
      name: "Times Square",
      rating: 4.6,
      reviews: 35982,
      type: "Tourist Attraction",
      address: "Manhattan, NY 10036",
      image: "/placeholder.svg?height=120&width=240",
      distance: "0.5 miles away",
    },
    {
      id: "4",
      name: "The Metropolitan Museum of Art",
      rating: 4.9,
      reviews: 18754,
      type: "Museum",
      address: "1000 5th Ave, New York, NY 10028",
      image: "/placeholder.svg?height=120&width=240",
      distance: "2.1 miles away",
    },
    {
      id: "5",
      name: "Brooklyn Bridge",
      rating: 4.8,
      reviews: 12543,
      type: "Landmark",
      address: "Brooklyn Bridge, New York, NY 10038",
      image: "/placeholder.svg?height=120&width=240",
      distance: "3.4 miles away",
    },
    {
      id: "5",
      name: "Brooklyn Bridge",
      rating: 4.8,
      reviews: 12543,
      type: "Landmark",
      address: "Brooklyn Bridge, New York, NY 10038",
      image: "/placeholder.svg?height=120&width=240",
      distance: "3.4 miles away",
    },
    {
      id: "6",
      name: "Brooklyn Bridge",
      rating: 4.8,
      reviews: 12543,
      type: "Landmark",
      address: "Brooklyn Bridge, New York, NY 10038",
      image: "/placeholder.svg?height=120&width=240",
      distance: "3.4 miles away",
    },
    {
      id: "7",
      name: "Brooklyn Bridge",
      rating: 4.8,
      reviews: 12543,
      type: "Landmark",
      address: "Brooklyn Bridge, New York, NY 10038",
      image: "/placeholder.svg?height=120&width=240",
      distance: "3.4 miles away",
    },
    {
      id: "8",
      name: "Brooklyn Bridge",
      rating: 4.8,
      reviews: 12543,
      type: "Landmark",
      address: "Brooklyn Bridge, New York, NY 10038",
      image: "/placeholder.svg?height=120&width=240",
      distance: "3.4 miles away",
    },
  ];

  const togglePlaces = () => {
    setPlacesOpen(!placesOpen);
  };

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
    <div className="relative flex h-[calc(100vh-4rem)] w-full flex-col overflow-hidden bg-background">
      {/* Map and places container */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Places panel (desktop) */}
        <div
          className={`relative hidden md:flex h-full flex-col border-r transition-all duration-300 ${
            placesOpen ? "w-full md:w-[400px]" : "w-0"
          }`}
        >
          {/* Search header */}
          <div className="sticky top-0 z-20 flex items-center gap-2 p-2 border-b bg-background">
            <div className="relative flex-1">
              <Search className="absolute w-4 h-4 -translate-y-1/2 left-3 top-1/2 text-muted-foreground" />
              <Input placeholder="Where to next?" className="pr-4 pl-9" />
            </div>
          </div>
          {placesOpen && (
            <>
              <div className="flex items-center justify-between p-3 border-b">
                <Tabs defaultValue="list" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="list">List</TabsTrigger>
                    <TabsTrigger value="photos">Photos</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Place cards (desktop) */}
              <div className="flex-1 p-2 overflow-y-auto">
                <Tabs defaultValue="relevance" className="mb-4">
                  <TabsList className="justify-start w-full overflow-x-auto">
                    <TabsTrigger value="relevance">Relevance</TabsTrigger>
                    <TabsTrigger value="distance">Distance</TabsTrigger>
                    <TabsTrigger value="rating">Rating</TabsTrigger>
                    <TabsTrigger value="hours">Hours</TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="grid gap-3">
                  {places.map((place) => (
                    <PlaceCard
                      key={place.id}
                      place={place}
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
          )}
        </div>

        {/* Map area */}
        <div className="relative flex-1">
          {/* Map placeholder */}
          <div className="h-full w-full bg-[#e5e3df]">
            <img
              src="https://images.unsplash.com/photo-1740600379671-46903506e162"
              alt="Map"
              className="object-cover w-full h-full"
            />
          </div>

          {/* Map controls */}
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

          {/* Places toggle button (when places panel is closed on desktop) */}
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

      {/* Mobile bottom panel */}
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
        <div className="h-full p-2 overflow-y-auto">
          <div className="grid gap-3">
            {places.map((place) => (
              <PlaceCard
                key={place.id}
                place={place}
                selectedPlace={selectedPlace}
                setSelectedPlace={setSelectedPlace}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface Place {
  id: string;
  name: string;
  rating: number;
  reviews: number;
  type: string;
  address: string;
  image: string;
  distance: string;
}

function PlaceCard({
  place,
  selectedPlace,
  setSelectedPlace,
}: {
  place: Place;
  selectedPlace: string | null;
  setSelectedPlace: (id: string | null) => void;
}) {
  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${
        selectedPlace === place.id ? "ring-2 ring-primary" : ""
      }`}
      onClick={() => setSelectedPlace(place.id)}
    >
      <CardContent className="p-0">
        <div className="flex">
          <div className="flex-1 p-2">
            <h3 className="font-semibold">{place.name}</h3>
            <div className="flex items-center gap-1 text-sm">
              <span className="flex items-center">
                {place.rating}{" "}
                <Star className="w-3 h-3 ml-1 fill-amber-400 text-amber-400" />
              </span>
              <span className="text-muted-foreground">
                ({place.reviews.toLocaleString()})
              </span>
            </div>
            <div className="text-sm text-muted-foreground">{place.type}</div>
            <div className="mt-1 text-sm text-muted-foreground">
              {place.distance}
            </div>
          </div>
          <div className="h-[100px] w-[100px] overflow-hidden">
            <img
              src={place.image || "/placeholder.svg"}
              alt={place.name}
              className="object-cover w-full h-full"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

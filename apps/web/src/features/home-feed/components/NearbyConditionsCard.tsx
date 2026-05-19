"use client";

import { useState } from "react";
import {
  Activity,
  LocateFixed,
  MapPin,
  RefreshCw,
  Sun,
  Thermometer,
  Waves,
  Wind,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNearbyConditionsQuery } from "@/features/home-feed/hooks/queries/useNearbyConditionsQuery";
import type {
  NearbyConditionCard,
  NearbyConditionsResponse,
} from "@freediving.ph/types";

type Coordinates = {
  lat: number;
  lng: number;
};

type GeoState = "idle" | "locating" | "local" | "denied" | "unsupported";

const fallbackConditions: NearbyConditionsResponse = {
  locationLabel: "Philippines",
  source: "fallback_country",
  cards: {
    current: {
      label: "Current",
      value: "Ask locally",
      confidence: "unknown",
    },
    visibility: {
      label: "Visibility",
      value: "Ask locally",
      confidence: "unknown",
    },
    temp: {
      label: "Temp",
      value: "Unavailable",
      confidence: "unknown",
    },
    wind: {
      label: "Wind",
      value: "Unavailable",
      confidence: "unknown",
    },
    sunrise: {
      label: "Sunrise",
      value: "Unavailable",
      confidence: "unknown",
    },
  },
};

const confidenceLabel = {
  reported: "Reported",
  forecast: "Forecast",
  unknown: "Unknown",
} as const;

const sourceLabel = {
  local: "Latest local report",
  nearest_dive_area: "Nearest dive area",
  fallback_country: "Country fallback",
} as const;

export function NearbyConditionsCard() {
  const [coords, setCoords] = useState<Coordinates>();
  const [geoState, setGeoState] = useState<GeoState>("idle");
  const [geoMessage, setGeoMessage] = useState("");
  const query = useNearbyConditionsQuery(coords ?? {});
  const conditions = query.data ?? fallbackConditions;

  const requestLocalConditions = () => {
    if (!("geolocation" in navigator)) {
      setGeoState("unsupported");
      setGeoMessage("Location is not available in this browser.");
      return;
    }

    setGeoState("locating");
    setGeoMessage("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setGeoState("local");
      },
      () => {
        setGeoState("denied");
        setGeoMessage(
          "Using the Philippines fallback. Check conditions locally before diving.",
        );
      },
      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 10 * 60 * 1000,
      },
    );
  };

  const cards = [
    { key: "current", data: conditions.cards.current, icon: Waves },
    { key: "visibility", data: conditions.cards.visibility, icon: Activity },
    { key: "temp", data: conditions.cards.temp, icon: Thermometer },
    { key: "wind", data: conditions.cards.wind, icon: Wind },
    { key: "sunrise", data: conditions.cards.sunrise, icon: Sun },
  ];

  const updatedLabel = conditions.updatedAt
    ? `Updated ${formatUpdatedAt(conditions.updatedAt)}`
    : "Availability varies by area";

  return (
    <Card className="space-y-3 p-3 sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-sm font-semibold sm:text-base">
              Nearby conditions
            </p>
            <Badge variant="outline" className="h-6 px-2 text-[11px]">
              {sourceLabel[conditions.source]}
            </Badge>
          </div>
          <p className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground sm:text-sm">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="min-w-0 break-words">
              {conditions.locationLabel}
            </span>
          </p>
          <p className="text-[11px] leading-snug text-muted-foreground sm:text-xs">
            {updatedLabel}. Visibility and current are reported when available,
            otherwise unknown.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 shrink-0 gap-1.5 px-2.5"
          onClick={requestLocalConditions}
          disabled={geoState === "locating"}
        >
          {geoState === "locating" ? (
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <LocateFixed className="h-3.5 w-3.5" />
          )}
          <span>{geoState === "locating" ? "Checking" : "Check locally"}</span>
        </Button>
      </div>

      {query.error || geoMessage ? (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-xs text-amber-900 dark:text-amber-200">
          {geoMessage ||
            "Conditions are taking longer than expected. Use local reports and direct site checks."}
        </p>
      ) : null}

      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5 sm:gap-2">
        {cards.map(({ key, data, icon: Icon }) => (
          <ConditionTile key={key} card={data} icon={Icon} />
        ))}
      </div>
    </Card>
  );
}

function ConditionTile({
  card,
  icon: Icon,
}: {
  card: NearbyConditionCard;
  icon: typeof Waves;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-md bg-muted/50 px-1.5 py-1.5 sm:px-2 sm:py-2">
      <div className="flex min-w-0 items-center gap-1">
        <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <p className="truncate text-[10px] font-medium text-muted-foreground sm:text-[11px]">
          {card.label}
        </p>
      </div>
      <p className="min-h-7 whitespace-normal break-words text-[11px] font-semibold leading-tight text-foreground sm:text-xs">
        {card.value}
      </p>
      <p className="text-[10px] leading-tight text-muted-foreground">
        {confidenceLabel[card.confidence]}
      </p>
    </div>
  );
}

function formatUpdatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "recently";
  }
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

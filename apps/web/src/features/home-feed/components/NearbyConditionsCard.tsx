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
import { cn } from "@/lib/utils";
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

const cardTone = {
  Current: {
    tile: "border-sky-200/80 bg-sky-50 text-sky-950 dark:border-sky-900/60 dark:bg-sky-950/35 dark:text-sky-50",
    icon: "text-sky-700 dark:text-sky-300",
    label: "text-sky-800/80 dark:text-sky-200/80",
    confidence: "text-sky-700/80 dark:text-sky-300/80",
  },
  Visibility: {
    tile: "border-teal-200/80 bg-teal-50 text-teal-950 dark:border-teal-900/60 dark:bg-teal-950/35 dark:text-teal-50",
    icon: "text-teal-700 dark:text-teal-300",
    label: "text-teal-800/80 dark:text-teal-200/80",
    confidence: "text-teal-700/80 dark:text-teal-300/80",
  },
  Temp: {
    tile: "border-rose-200/80 bg-rose-50 text-rose-950 dark:border-rose-900/60 dark:bg-rose-950/35 dark:text-rose-50",
    icon: "text-rose-700 dark:text-rose-300",
    label: "text-rose-800/80 dark:text-rose-200/80",
    confidence: "text-rose-700/80 dark:text-rose-300/80",
  },
  Wind: {
    tile: "border-slate-200 bg-slate-50 text-slate-950 dark:border-slate-800 dark:bg-slate-900/55 dark:text-slate-50",
    icon: "text-slate-700 dark:text-slate-300",
    label: "text-slate-700/80 dark:text-slate-200/80",
    confidence: "text-slate-600 dark:text-slate-300/80",
  },
  Sunrise: {
    tile: "border-amber-200/80 bg-amber-50 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-50",
    icon: "text-amber-700 dark:text-amber-300",
    label: "text-amber-800/80 dark:text-amber-200/80",
    confidence: "text-amber-700/80 dark:text-amber-300/80",
  },
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
    <Card className="space-y-3 p-3 sm:p-4 gap-1!">
      <div className="flex flex-wrap items-start justify-between gap-1!">
        <div className="min-w-0 space-y-1 w-full">
          <div className="flex justify-between">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <p className="text-sm font-semibold sm:text-base">
                Nearby conditions
              </p>
              <Badge variant="outline" className="px-2 text-[11px]">
                {sourceLabel[conditions.source]}
              </Badge>
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
              <span>
                {geoState === "locating" ? "Checking" : "Check locally"}
              </span>
            </Button>
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
  const tone = cardTone[card.label];

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-1 rounded-md border px-1.5 py-1.5 shadow-sm sm:px-2 sm:py-2",
        tone.tile,
      )}
    >
      <div className="flex min-w-0 items-center gap-1">
        <Icon className={cn("h-3.5 w-3.5 shrink-0", tone.icon)} />
        <p
          className={cn(
            "truncate text-[10px] font-medium sm:text-[11px]",
            tone.label,
          )}
        >
          {card.label}
        </p>
      </div>
      <p className="min-h-7 whitespace-normal break-words text-[11px] font-semibold leading-tight sm:text-xs">
        {card.value}
      </p>
      <p className={cn("text-[10px] leading-tight", tone.confidence)}>
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

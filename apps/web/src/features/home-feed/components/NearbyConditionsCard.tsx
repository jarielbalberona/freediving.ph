"use client";

import { Activity, MapPin, Sun, Thermometer, Waves, Wind } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { HomeFeedNearbyCondition } from "@freediving.ph/types";

export function NearbyConditionsCard({
  condition,
}: {
  condition: HomeFeedNearbyCondition;
}) {
  const metrics = [
    { label: "Current", value: condition.current, icon: Waves },
    { label: "Visibility", value: condition.visibility, icon: Activity },
    { label: "Temp", value: condition.waterTemp, icon: Thermometer },
    { label: "Wind", value: condition.wind, icon: Wind },
    { label: "Sunrise", value: condition.sunrise, icon: Sun },
  ];

  return (
    <Card className="space-y-2.5 p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-sm font-semibold sm:text-base">
              Nearby conditions
            </p>
            <p className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground sm:text-sm">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0 break-words">{condition.spot}</span>
              {condition.distanceKm !== undefined ? (
                <span className="shrink-0">· {condition.distanceKm} km</span>
              ) : null}
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className="h-7 border-emerald-500/40 px-2.5 text-emerald-700"
        >
          {condition.safety}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5 sm:gap-2">
        {metrics.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="flex min-w-0 items-center gap-1 rounded-md bg-muted/50 px-1.5 py-1.5 sm:gap-1.5 sm:px-2 sm:py-2"
          >
            <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <div className="min-w-0 leading-tight">
              <p className="text-[10px] font-medium text-muted-foreground sm:text-[11px]">
                {label}
              </p>
              <p className="whitespace-normal break-words text-[11px] font-semibold leading-tight text-foreground sm:text-xs">
                {value}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

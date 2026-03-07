"use client";

import { Activity, MapPin, Sun, Thermometer, Waves, Wind } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { HomeFeedNearbyCondition } from "@freediving.ph/types";

export function NearbyConditionsCard({ condition }: { condition: HomeFeedNearbyCondition }) {
  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-base font-semibold">Nearby conditions</p>
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            {condition.spot}
            {condition.distanceKm !== undefined ? ` · ${condition.distanceKm} km` : ""}
          </p>
        </div>
        <Badge variant="outline" className="border-emerald-500/40 text-emerald-300">
          {condition.safety}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div className="rounded-md bg-muted/60 p-3">
          <p className="flex items-center gap-1.5 text-muted-foreground">
            <Waves className="h-4 w-4" />
            Current
          </p>
          <p className="font-medium text-base">{condition.current}</p>
        </div>
        <div className="rounded-md bg-muted/60 p-3">
          <p className="flex items-center gap-1.5 text-muted-foreground">
            <Activity className="h-4 w-4" />
            Visibility
          </p>
          <p className="font-medium text-base">{condition.visibility}</p>
        </div>
        <div className="rounded-md bg-muted/60 p-3">
          <p className="flex items-center gap-1.5 text-muted-foreground">
            <Thermometer className="h-4 w-4" />
            Temp
          </p>
          <p className="font-medium text-base">{condition.waterTemp}</p>
        </div>
        <div className="rounded-md bg-muted/60 p-3">
          <p className="flex items-center gap-1.5 text-muted-foreground">
            <Wind className="h-4 w-4" />
            Wind
          </p>
          <p className="font-medium text-base">{condition.wind}</p>
        </div>
      </div>

      <p className="flex items-center gap-1.5 text-sm text-muted-foreground pt-1">
        <Sun className="h-4 w-4" />
        Sunrise {condition.sunrise}
      </p>
    </Card>
  );
}

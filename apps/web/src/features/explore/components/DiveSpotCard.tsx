"use client";

import Link from "next/link";
import * as React from "react";
import { Gauge, MapPin, TriangleAlert, Users, Waves, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { DiveSpot } from "../types";

type DiveSpotCardProps = {
  spot: DiveSpot;
  selected: boolean;
  onSelect: (spot: DiveSpot) => void;
  onClose?: () => void;
  actions?: React.ReactNode;
};

const gradientFromName = (name: string) => {
  const hues = [188, 204, 152, 26, 345];
  const hue = hues[name.length % hues.length];
  return `linear-gradient(135deg, hsl(${hue} 72% 60%) 0%, hsl(${(hue + 36) % 360} 76% 38%) 100%)`;
};

const verificationLabel = (value: DiveSpot["verificationStatus"]) => {
  switch (value) {
    case "verified":
      return "Verified";
    case "moderator":
      return "Checked by team";
    case "instructor":
      return "Instructor noted";
    case "community":
    default:
      return "Community shared";
  }
};

const difficultyLabel = (value: DiveSpot["difficulty"]) => {
  switch (value) {
    case "easy":
      return "Easy";
    case "moderate":
      return "Moderate";
    case "hard":
      return "Hard";
  }
};

const depthLabel = (spot: DiveSpot) => {
  const hasMin = typeof spot.depthMinM === "number";
  const hasMax = typeof spot.depthMaxM === "number";
  if (hasMin && hasMax) return `${spot.depthMinM}m-${spot.depthMaxM}m`;
  if (hasMin) return `From ${spot.depthMinM}m`;
  if (hasMax) return `Up to ${spot.depthMaxM}m`;
  return null;
};

export const DiveSpotCard = React.forwardRef<HTMLDivElement, DiveSpotCardProps>(
  ({ spot, selected, onSelect, onClose, actions }, ref) => {
    const depth = depthLabel(spot);
    const visibleHazards = spot.hazards.slice(0, 2);

    return (
      <div
        ref={ref}
        id={`explore-spot-card-${spot.id}`}
        className={cn(
          "relative border-b border-border/70 bg-background px-3 py-3 transition-colors hover:bg-muted/35",
          selected &&
            "border-l-4 border-l-primary bg-primary/5 ring-1 ring-primary/25",
          onClose &&
            "rounded-3xl border border-border/70 bg-card/95 shadow-xl hover:bg-card",
        )}
      >
        {onClose ? (
          <Button
            variant="secondary"
            size="icon-sm"
            className="absolute right-6 top-6 z-10 rounded-full"
            aria-label={`Hide ${spot.name}`}
            onClick={(event) => {
              event.stopPropagation();
              onClose();
            }}
          >
            <X className="size-4" />
          </Button>
        ) : null}
        <div
          className="cursor-pointer"
          onClick={() => onSelect(spot)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onSelect(spot);
            }
          }}
          role="button"
          tabIndex={0}
          aria-pressed={selected}
          aria-label={`Select ${spot.name}`}
        >
          <div className="grid w-full grid-cols-[84px_minmax(0,1fr)] gap-3 sm:grid-cols-[96px_minmax(0,1fr)]">
            <div
              className="relative h-24 overflow-hidden rounded-2xl sm:h-28"
              style={{ backgroundImage: gradientFromName(spot.name) }}
            >
              {spot.coverImageUrl ? (
                <img
                  src={spot.coverImageUrl}
                  alt={spot.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-end p-3 text-sm font-semibold text-primary-foreground">
                  {spot.area}
                </div>
              )}
            </div>

            <div className="flex min-w-0 flex-col gap-2">
              <div className="space-y-1">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="line-clamp-2 text-base font-semibold text-foreground">
                    {spot.name}
                  </h3>
                </div>
                <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
                  <MapPin className="size-4" />
                  {spot.area}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant="secondary"
                    className="rounded-full bg-muted px-2.5 py-1 text-xs"
                  >
                    {difficultyLabel(spot.difficulty)}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="rounded-full px-2.5 py-1 text-xs"
                  >
                    {verificationLabel(spot.verificationStatus)}
                  </Badge>
                  {depth ? (
                    <Badge
                      variant="outline"
                      className="rounded-full px-2.5 py-1 text-xs"
                    >
                      <Gauge className="mr-1.5 size-3.5" />
                      {depth}
                    </Badge>
                  ) : null}
                  {spot.recentUpdateCount > 0 ? (
                    <Badge
                      variant="outline"
                      className="rounded-full px-2.5 py-1 text-xs"
                    >
                      <Waves className="mr-1.5 size-3.5" />
                      {spot.recentUpdateCount} recent update
                      {spot.recentUpdateCount === 1 ? "" : "s"}
                    </Badge>
                  ) : null}
                </div>
              </div>

              {spot.lastConditionSummary ? (
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {spot.lastConditionSummary}
                </p>
              ) : null}

              {visibleHazards.length > 0 ? (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <TriangleAlert className="size-3.5" />
                  Hazards noted: {visibleHazards.join(", ")}
                  {spot.hazards.length > visibleHazards.length ? " +" : ""}
                </p>
              ) : null}

              {actions ? (
                <div
                  className="flex flex-nowrap items-center gap-1.5 overflow-x-auto pt-0.5"
                  onClick={(event) => event.stopPropagation()}
                >
                  {actions}
                </div>
              ) : null}

              <Link
                href={`/explore/sites/${spot.slug}`}
                className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-primary underline-offset-4 hover:underline"
                onClick={(event) => event.stopPropagation()}
              >
                <Users className="size-3.5" />
                Check buddy activity
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  },
);

DiveSpotCard.displayName = "DiveSpotCard";

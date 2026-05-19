"use client";

import * as React from "react";
import { MapPin, Waves, X } from "lucide-react";

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

export const DiveSpotCard = React.forwardRef<HTMLDivElement, DiveSpotCardProps>(
  ({ spot, selected, onSelect, onClose, actions }, ref) => {
    return (
      <div
        ref={ref}
        id={`explore-spot-card-${spot.id}`}
        className={cn(
          "relative border-b border-border/70 bg-background px-3 py-3 transition-colors hover:bg-muted/35",
          selected && "bg-primary/5 ring-primary/20 ring-1",
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
                    className="rounded-full bg-muted px-2.5 py-1 text-xs capitalize"
                  >
                    {spot.difficulty}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="rounded-full px-2.5 py-1 text-xs capitalize"
                  >
                    {verificationLabel(spot.verificationStatus)}
                  </Badge>
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
                <p className="text-sm text-muted-foreground">
                  {spot.lastConditionSummary}
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
            </div>
          </div>
        </div>
      </div>
    );
  },
);

DiveSpotCard.displayName = "DiveSpotCard";

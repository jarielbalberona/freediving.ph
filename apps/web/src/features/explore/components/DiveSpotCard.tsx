"use client";

import * as React from "react";
import { MapPin, Star, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

export const DiveSpotCard = React.forwardRef<HTMLDivElement, DiveSpotCardProps>(
  ({ spot, selected, onSelect, onClose, actions }, ref) => {
    return (
      <Card
        ref={ref}
        id={`explore-spot-card-${spot.id}`}
        className={cn(
          "mx-1 my-4 py-1 overflow-hidden border-border/70 bg-card/95 shadow-sm transition-all",
          selected && "border-primary/45 ring-primary/20 ring-2 shadow-lg",
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
          <CardContent className="grid w-full gap-4 p-4 sm:grid-cols-[132px_1fr]">
            <div
              className="relative h-36 overflow-hidden rounded-3xl"
              style={{ backgroundImage: gradientFromName(spot.name) }}
            >
              {spot.coverImageUrl ? (
                <img
                  src={spot.coverImageUrl}
                  alt={spot.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="text-primary-foreground flex h-full items-end p-4 text-lg font-semibold">
                  {spot.area}
                </div>
              )}
            </div>

            <div className="flex min-w-0 flex-col gap-3">
              <div className="space-y-1">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="line-clamp-2 text-base font-semibold text-foreground">
                    {spot.name}
                  </h3>
                  {typeof spot.rating === "number" ? (
                    <div className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
                      <Star className="size-3.5 fill-current" />
                      {spot.rating.toFixed(1)}
                    </div>
                  ) : null}
                </div>
                <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
                  <MapPin className="size-4" />
                  {spot.area}
                </p>
                {typeof spot.reviewCount === "number" ? (
                  <p className="text-muted-foreground text-xs">
                    {spot.reviewCount.toLocaleString()} reviews
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                {(spot.tags ?? []).slice(0, 4).map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="rounded-full bg-muted px-2.5 py-1 text-xs"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>

              {actions ? (
                <div
                  className="flex flex-wrap gap-2 pt-1"
                  onClick={(event) => event.stopPropagation()}
                >
                  {actions}
                </div>
              ) : null}
            </div>
          </CardContent>
        </div>
      </Card>
    );
  },
);

DiveSpotCard.displayName = "DiveSpotCard";

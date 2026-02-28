"use client";

import { useEffect, useMemo, useRef } from "react";
import { ArrowUpWideNarrow } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import type { DiveSpot } from "../types";
import { DiveSpotCard } from "./DiveSpotCard";

type SortMode = "relevance" | "rating" | "reviews";

type ExploreResultsPanelProps = {
  q: string;
  total: number;
  loading: boolean;
  fetching: boolean;
  spots: DiveSpot[];
  selectedSpotId: string | null;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
  filtersControl: React.ReactNode;
  onQueryChange: (q: string) => void;
  onSelectSpot: (spot: DiveSpot) => void;
  sort: SortMode;
  onSortChange: (sort: SortMode) => void;
  onResetFilters: () => void;
  className?: string;
  compactControls?: boolean;
  showSearchControls?: boolean;
  renderSpotActions?: (spot: DiveSpot) => React.ReactNode;
};

const sortLabels: Record<SortMode, string> = {
  relevance: "Relevance",
  rating: "Top rated",
  reviews: "Most reviewed",
};

export function ExploreResultsPanel({
  q,
  total,
  loading,
  fetching,
  spots,
  selectedSpotId,
  searchInputRef,
  filtersControl,
  onQueryChange,
  onSelectSpot,
  sort,
  onSortChange,
  onResetFilters,
  className,
  compactControls = false,
  showSearchControls = true,
  renderSpotActions,
}: ExploreResultsPanelProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const hasResults = spots.length > 0;

  useEffect(() => {
    if (!selectedSpotId) return;

    // Marker clicks update the selected spot; the list follows that selection instead of drifting.
    const card = scrollAreaRef.current?.querySelector<HTMLElement>(
      `#explore-spot-card-${selectedSpotId}`,
    );

    card?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedSpotId]);

  const resultLabel = useMemo(() => {
    if (loading) return "Loading dive spots";
    return `${total.toLocaleString()} dive spots`;
  }, [loading, total]);

  return (
    <div
      className={cn(
        "bg-background flex h-full min-h-0 flex-col border-r border-black/5",
        className,
      )}
    >
      <div className="border-b border-black/5 px-4 pb-4 pt-4">
        {showSearchControls ? (
          <div className="flex items-center gap-2">
            <Input
              ref={searchInputRef}
              value={q}
              autoFocus
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Search dive spots"
              aria-label="Search dive spots"
              className="h-11 rounded-full bg-slate-50"
            />
            {filtersControl}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="outline"
                    size={compactControls ? "icon" : "default"}
                    className={cn(
                      "h-11 rounded-full",
                      compactControls && "size-11",
                    )}
                    aria-label="Sort results"
                  />
                }
              >
                <ArrowUpWideNarrow className="size-4.5" />
                {!compactControls ? sortLabels[sort] : null}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={() => onSortChange("relevance")}>
                  Relevance
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSortChange("rating")}>
                  Top rated
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSortChange("reviews")}>
                  Most reviewed
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : null}

        <div
          className={cn(
            "mt-4",
            !showSearchControls &&
              "mt-0 flex items-center justify-between gap-3",
          )}
        >
          <p className="text-sm font-semibold text-foreground">{resultLabel}</p>
          <p className="text-muted-foreground text-xs">
            {fetching && !loading
              ? "Refreshing results for the current query."
              : "Map and list stay in sync."}
          </p>
          {!showSearchControls ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-10 rounded-full"
                    aria-label="Sort results"
                  />
                }
              >
                <ArrowUpWideNarrow className="size-4.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={() => onSortChange("relevance")}>
                  Relevance
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSortChange("rating")}>
                  Top rated
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSortChange("reviews")}>
                  Most reviewed
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>

      <ScrollArea ref={scrollAreaRef} className="min-h-0 flex-1 p-2">
        <div className="space-y-3 pb-6">
          {loading ? (
            Array.from({ length: 6 }).map((_, index) => (
              <div
                key={`explore-skeleton-${index}`}
                className="rounded-[28px] border border-black/5 bg-white p-4"
              >
                <div className="grid gap-4 sm:grid-cols-[132px_1fr]">
                  <Skeleton className="h-36 rounded-[22px]" />
                  <div className="space-y-3">
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-1/3" />
                    <div className="flex gap-2">
                      <Skeleton className="h-6 w-20 rounded-full" />
                      <Skeleton className="h-6 w-16 rounded-full" />
                      <Skeleton className="h-6 w-20 rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : hasResults ? (
            spots.map((spot) => (
              <DiveSpotCard
                key={spot.id}
                spot={spot}
                selected={selectedSpotId === spot.id}
                onSelect={onSelectSpot}
                actions={renderSpotActions?.(spot)}
              />
            ))
          ) : (
            <div className="rounded-[28px] border border-dashed border-black/10 bg-slate-50 px-5 py-8">
              <p className="text-base font-semibold text-foreground">
                No dive spots found
              </p>
              <p className="text-muted-foreground mt-2 text-sm">
                Try widening the map area or resetting your filters.
              </p>
              <Button
                className="mt-4 rounded-full"
                variant="outline"
                onClick={onResetFilters}
              >
                Reset filters
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { ArrowUpWideNarrow, LoaderCircle } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
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

type SortMode = "relevance" | "recent";

type ExploreResultsPanelProps = {
  q: string;
  total: number;
  loading: boolean;
  fetching: boolean;
  spots: DiveSpot[];
  selectedSpotId: string | null;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
  filtersControl: React.ReactNode;
  onQueryChange: (q: string) => void;
  onLoadMore: () => void;
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
  recent: "Recent updates",
};

export function ExploreResultsPanel({
  q,
  total,
  loading,
  fetching,
  spots,
  selectedSpotId,
  hasNextPage,
  isFetchingNextPage,
  searchInputRef,
  filtersControl,
  onQueryChange,
  onLoadMore,
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
    if (loading) return "Finding dive spots";
    return `${total.toLocaleString()} dive spots`;
  }, [loading, total]);

  return (
    <div
      className={cn(
        "bg-background flex h-full min-h-0 flex-col border-r border-border",
        className,
      )}
    >
      <div className="border-b border-border px-4 pb-4 pt-4">
        {showSearchControls ? (
          <div className="flex items-center gap-2">
            <Input
              ref={searchInputRef}
              value={q}
              autoFocus
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Search beaches, towns, or dive spots"
              aria-label="Search beaches, towns, or dive spots"
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
                <DropdownMenuItem onClick={() => onSortChange("recent")}>
                  Recent updates
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
              ? "Refreshing results for this search."
              : "Search or move the map to find dive spots."}
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
                <DropdownMenuItem onClick={() => onSortChange("recent")}>
                  Recent updates
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>

      <ScrollArea ref={scrollAreaRef} className="min-h-0 flex-1">
        <div className="pb-6">
          {loading ? (
            <>
              <div className="border-b border-border bg-muted/25 px-4 py-4">
                <p className="text-base font-semibold text-foreground">
                  Finding dive spots around the Philippines
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Search by beach, town, or dive site. You can also move the map
                  and search that area.
                </p>
              </div>
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={`explore-skeleton-${index}`}
                  className="border-b border-border bg-background px-3 py-3"
                >
                  <div className="grid grid-cols-[96px_1fr] gap-3">
                    <Skeleton className="h-28 rounded-2xl" />
                    <div className="space-y-2">
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
              ))}
            </>
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
            <div className="rounded-4xl border border-dashed border-border/80 bg-muted/40 px-5 py-8">
              <p className="text-base font-semibold text-foreground">
                We do not have a match for this area yet
              </p>
              <p className="text-muted-foreground mt-2 text-sm">
                Try a nearby town, move the map to another coastline, or suggest
                a dive site so the community can review it.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  className="rounded-full"
                  variant="outline"
                  onClick={onResetFilters}
                >
                  Reset search
                </Button>
                <Link
                  href="/explore/submit"
                  className={cn(buttonVariants({ size: "sm" }), "rounded-full")}
                >
                  Suggest a dive site
                </Link>
              </div>
            </div>
          )}
          {hasResults && hasNextPage ? (
            <div className="flex justify-center px-2 pb-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                onClick={onLoadMore}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? (
                  <>
                    <LoaderCircle className="mr-2 size-4 animate-spin" />
                    Finding more sites
                  </>
                ) : (
                  "Load more sites"
                )}
              </Button>
            </div>
          ) : null}
        </div>
      </ScrollArea>
    </div>
  );
}

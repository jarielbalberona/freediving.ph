"use client";

import type * as React from "react";
import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowUpWideNarrow,
  Heart,
  LoaderCircle,
  MapPinned,
  ShieldCheck,
} from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import type { DiveSpot, ExploreDifficulty, ExploreSortMode } from "../types";
import { DiveSpotCard } from "./DiveSpotCard";

type ExploreResultsPanelProps = {
  q: string;
  area: string;
  areaOptions: string[];
  difficulty: ExploreDifficulty;
  verifiedOnly: boolean;
  savedOnly: boolean;
  canUseSavedFilter: boolean;
  savedOnlyRequiresSignIn: boolean;
  total: number;
  loading: boolean;
  fetching: boolean;
  hasAppliedBounds: boolean;
  errorMessage?: string;
  spots: DiveSpot[];
  selectedSpotId: string | null;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
  filtersControl?: React.ReactNode;
  onQueryChange: (q: string) => void;
  onAreaChange: (area: string) => void;
  onDifficultyChange: (difficulty: ExploreDifficulty) => void;
  onVerifiedOnlyChange: (verifiedOnly: boolean) => void;
  onSavedOnlyChange: (savedOnly: boolean) => void;
  onLoadMore: () => void;
  onSelectSpot: (spot: DiveSpot) => void;
  sort: ExploreSortMode;
  onSortChange: (sort: ExploreSortMode) => void;
  onResetFilters: () => void;
  className?: string;
  compactControls?: boolean;
  showSearchControls?: boolean;
  renderSpotActions?: (spot: DiveSpot) => React.ReactNode;
};

const sortLabels: Record<ExploreSortMode, string> = {
  default: "Default order",
  recent: "Recent updates",
};

const difficultyLabels: Record<ExploreDifficulty, string> = {
  all: "Any level",
  easy: "Easy",
  moderate: "Moderate",
  hard: "Hard",
};

const difficultySelectItems = ([
  "all",
  "easy",
  "moderate",
  "hard",
] as const).map((value) => ({
  value,
  label: difficultyLabels[value],
}));

export function ExploreResultsPanel({
  q,
  area,
  areaOptions,
  difficulty,
  verifiedOnly,
  savedOnly,
  canUseSavedFilter,
  savedOnlyRequiresSignIn,
  total,
  loading,
  fetching,
  hasAppliedBounds,
  errorMessage,
  spots,
  selectedSpotId,
  hasNextPage,
  isFetchingNextPage,
  searchInputRef,
  filtersControl,
  onQueryChange,
  onAreaChange,
  onDifficultyChange,
  onVerifiedOnlyChange,
  onSavedOnlyChange,
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
  const areaSelectValue = area || "all";
  const areaSelectItems = useMemo(
    () => [
      { value: "all", label: "All areas" },
      ...areaOptions.map((option) => ({ value: option, label: option })),
    ],
    [areaOptions],
  );

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
    return `Showing ${total.toLocaleString()} loaded dive spot${total === 1 ? "" : "s"}`;
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
          <div className="mb-3">
            <p className="text-base font-semibold text-foreground">
              Find dive spots around the Philippines
            </p>
          </div>
        ) : null}
        {showSearchControls ? (
          <div>
            <div className="flex items-center gap-2">
              <Input
                ref={searchInputRef}
                value={q}
                autoFocus
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder="Search by site, town, or area"
                aria-label="Search by site, town, or area"
                className="h-11 rounded-full bg-background"
              />
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
                  <DropdownMenuItem onClick={() => onSortChange("default")}>
                    Default order
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onSortChange("recent")}>
                    Recent updates
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Select
                value={difficulty}
                onValueChange={(value) => {
                  if (!value) return;
                  onDifficultyChange(value as ExploreDifficulty);
                }}
                items={difficultySelectItems}
              >
                <SelectTrigger
                  aria-label="Filter by difficulty"
                  className="h-9 rounded-full"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["all", "easy", "moderate", "hard"] as const).map(
                    (value) => (
                      <SelectItem key={value} value={value}>
                        {difficultyLabels[value]}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>

              <Select
                value={areaSelectValue}
                onValueChange={(value) => {
                  if (!value) return;
                  onAreaChange(value === "all" ? "" : value);
                }}
                items={areaSelectItems}
              >
                <SelectTrigger
                  aria-label="Filter by area"
                  className="h-9 max-w-[210px] rounded-full"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="start">
                  <SelectItem value="all">All areas</SelectItem>
                  {areaOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                type="button"
                variant={verifiedOnly ? "default" : "outline"}
                size="sm"
                className="rounded-full"
                aria-pressed={verifiedOnly}
                onClick={() => onVerifiedOnlyChange(!verifiedOnly)}
              >
                <ShieldCheck className="size-4" />
                Verified only
              </Button>
              <Button
                type="button"
                variant={savedOnly ? "default" : "outline"}
                size="sm"
                className="rounded-full"
                aria-pressed={savedOnly}
                disabled={!canUseSavedFilter && !savedOnly}
                onClick={() => {
                  if (!canUseSavedFilter && !savedOnly) return;
                  onSavedOnlyChange(!savedOnly);
                }}
              >
                <Heart className={cn("size-4", savedOnly && "fill-current")} />
                Saved
              </Button>
              {filtersControl}
            </div>
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
              : hasAppliedBounds
                ? "Results match the last searched map area."
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
                <DropdownMenuItem onClick={() => onSortChange("default")}>
                  Default order
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
          {savedOnlyRequiresSignIn ? (
            <div className="mx-4 mt-4 rounded-3xl border border-border bg-muted/40 px-5 py-6">
              <Heart className="mb-3 size-5 text-muted-foreground" />
              <p className="font-semibold text-foreground">
                Sign in to view saved dive spots.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Saved filters use your account. Public dive spots are still
                available without signing in.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href="/sign-in"
                  className={cn(buttonVariants({ size: "sm" }), "rounded-full")}
                >
                  Sign in
                </Link>
                <Button
                  className="rounded-full"
                  variant="outline"
                  size="sm"
                  onClick={onResetFilters}
                >
                  Clear saved filter
                </Button>
              </div>
            </div>
          ) : errorMessage ? (
            <div className="mx-4 mt-4 rounded-3xl border border-destructive/25 bg-destructive/5 px-5 py-5">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 size-5 text-destructive" />
                <div>
                  <p className="font-semibold text-foreground">
                    Could not load dive spots
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    The list did not load. Try clearing search or changing the
                    filters, then search the area again.
                  </p>
                  <Button
                    className="mt-4 rounded-full"
                    variant="outline"
                    size="sm"
                    onClick={onResetFilters}
                  >
                    Clear search and filters
                  </Button>
                </div>
              </div>
            </div>
          ) : loading ? (
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
              {hasAppliedBounds ? (
                <MapPinned className="mb-3 size-5 text-muted-foreground" />
              ) : null}
              <p className="text-base font-semibold text-foreground">
                {savedOnly
                  ? "No saved dive spots match this search"
                  : hasAppliedBounds
                    ? "No dive spots loaded in this map area"
                    : "No loaded dive spots match this search"}
              </p>
              <p className="text-muted-foreground mt-2 text-sm">
                {savedOnly
                  ? "Clear the saved filter, change search or filters, or save a dive spot from its card."
                  : hasAppliedBounds
                    ? "Move the map and search another area, or clear search and filters if they are too narrow."
                    : "Clear the search, change filters, or move the map and search that area. If a legit spot is missing, suggest it for review."}
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

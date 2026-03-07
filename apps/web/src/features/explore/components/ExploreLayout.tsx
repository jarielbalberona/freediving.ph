"use client";

import Link from "next/link";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  Check,
  Compass,
  ExternalLink,
  Gavel,
  Heart,
  MapPinned,
  Share2,
  SlidersHorizontal,
} from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { MapProvider } from "@/providers/map-provider";
import { useSidebar } from "@/components/ui/sidebar";
import { useSession } from "@/features/auth/session";

import { exploreApi } from "../api/exploreApi";
import { useMapBounds } from "../hooks/useMapBounds";
import { useExploreQueryState } from "../hooks/useExploreQueryState";
import {
  EXPLORE_DEFAULT_LIMIT,
  EXPLORE_TAG_OPTIONS,
  type DiveSpot,
} from "../types";
import { DiveSpotCard } from "./DiveSpotCard";
import { ExploreMap } from "./ExploreMap";
import { ExploreMobileToggle } from "./ExploreMobileToggle";
import { ExploreResultsPanel } from "./ExploreResultsPanel";

type SortMode = "relevance" | "rating" | "reviews";

const sortItems = (items: DiveSpot[], sort: SortMode) => {
  switch (sort) {
    case "rating":
      return [...items].sort(
        (left, right) => (right.rating ?? 0) - (left.rating ?? 0),
      );
    case "reviews":
      return [...items].sort(
        (left, right) => (right.reviewCount ?? 0) - (left.reviewCount ?? 0),
      );
    default:
      return items;
  }
};

function FilterContent({
  minRating,
  tags,
  onSelectRating,
  onToggleTag,
  onReset,
}: {
  minRating: number | null;
  tags: string[];
  onSelectRating: (rating: number | null) => void;
  onToggleTag: (tag: string) => void;
  onReset: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Minimum rating</p>
          <Button variant="ghost" size="sm" onClick={onReset}>
            Reset
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Any", value: null },
            { label: "4.0+", value: 4 },
            { label: "4.5+", value: 4.5 },
          ].map((option) => {
            const active = minRating === option.value;
            return (
              <Button
                key={option.label}
                variant={active ? "default" : "outline"}
                className="rounded-full"
                onClick={() => onSelectRating(option.value)}
              >
                {option.label}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-semibold">Tags</p>
        <div className="flex flex-wrap gap-2">
          {EXPLORE_TAG_OPTIONS.map((tag) => {
            const active = tags.includes(tag);
            return (
              <Button
                key={tag}
                variant={active ? "default" : "outline"}
                className="rounded-full"
                onClick={() => onToggleTag(tag)}
              >
                {active ? <Check className="mr-1.5 size-4" /> : null}
                {tag}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function ExploreLayout() {
  const session = useSession();
  const { setOpen, setOpenMobile } = useSidebar();
  const didForceSidebarCloseRef = useRef(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [sort, setSort] = useState<SortMode>("relevance");
  const [savedSpotIds, setSavedSpotIds] = useState<string[]>([]);

  const {
    state,
    resetFilters,
    setBounds,
    setCamera,
    setMinRating,
    setQuery,
    setSelectedSpot,
    setView,
    toggleTag,
  } = useExploreQueryState();

  const deferredQuery = useDeferredValue(state.q);
  const boundsState = useMapBounds(state.bounds);

  const exploreQuery = useQuery({
    queryKey: [
      "explore",
      {
        q: deferredQuery,
        minRating: state.minRating,
        tags: state.tags,
        bounds: state.bounds,
        limit: EXPLORE_DEFAULT_LIMIT,
        offset: 0,
      },
    ],
    queryFn: () =>
      exploreApi.searchDiveSpots({
        q: deferredQuery,
        minRating: state.minRating,
        tags: state.tags,
        bounds: state.bounds,
        limit: EXPLORE_DEFAULT_LIMIT,
        offset: 0,
      }),
    placeholderData: keepPreviousData,
  });

  const sortedItems = useMemo(
    () => sortItems(exploreQuery.data?.items ?? [], sort),
    [exploreQuery.data?.items, sort],
  );
  const selectedSpot =
    sortedItems.find((spot) => spot.id === state.selectedSpotId) ?? null;

  useEffect(() => {
    const saved = window.localStorage.getItem("explore-saved-spots");
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        setSavedSpotIds(
          parsed.filter((value): value is string => typeof value === "string"),
        );
      }
    } catch {
      window.localStorage.removeItem("explore-saved-spots");
    }
  }, []);

  useEffect(() => {
    if (didForceSidebarCloseRef.current) return;
    didForceSidebarCloseRef.current = true;
    setOpen(false);
    setOpenMobile(false);
  }, [setOpen, setOpenMobile]);

  useEffect(() => {
    if (!state.selectedSpotId) return;
    if (sortedItems.some((spot) => spot.id === state.selectedSpotId)) return;
    setSelectedSpot(null);
  }, [setSelectedSpot, sortedItems, state.selectedSpotId]);

  const handleSelectSpot = (spot: DiveSpot) => {
    // Selection is shared state for both the list and the map, so either surface can drive the other.
    setSelectedSpot(spot.id);
  };

  const handleApplyAreaSearch = () => {
    const nextBounds = boundsState.applyDraftBounds();
    setBounds(nextBounds);
  };

  const handleResetFilters = () => {
    resetFilters();
    setSelectedSpot(null);
  };

  const toggleSavedSpot = (spotId: string) => {
    setSavedSpotIds((current) => {
      const next = current.includes(spotId)
        ? current.filter((id) => id !== spotId)
        : [...current, spotId];

      window.localStorage.setItem("explore-saved-spots", JSON.stringify(next));
      return next;
    });
  };

  const shareSpot = async (spot: DiveSpot) => {
    const url = `${window.location.origin}/explore/sites/${spot.id}`;
    if (navigator.share) {
      await navigator.share({ title: spot.name, url });
      return;
    }

    await navigator.clipboard.writeText(url);
  };

  const renderSpotActions = (spot: DiveSpot) => {
    const isSaved = savedSpotIds.includes(spot.id);

    return (
      <>
        <Link href={`/explore/sites/${spot.id}`}>
          <Button size="sm" variant="outline" className="rounded-full">
            <ExternalLink className="mr-1.5 size-4" />
            Open site
          </Button>
        </Link>
        <Button
          size="sm"
          variant="outline"
          className="rounded-full"
          onClick={() => void shareSpot(spot)}
        >
          <Share2 className="mr-1.5 size-4" />
          Share
        </Button>
        <Button
          size="sm"
          variant={isSaved ? "default" : "outline"}
          className="rounded-full"
          onClick={() => toggleSavedSpot(spot.id)}
        >
          <Heart className={cn("mr-1.5 size-4", isSaved && "fill-current")} />
          {isSaved ? "Saved" : "Save"}
        </Button>
      </>
    );
  };

  const filterContent = (
    <FilterContent
      minRating={state.minRating}
      tags={state.tags}
      onSelectRating={setMinRating}
      onToggleTag={toggleTag}
      onReset={handleResetFilters}
    />
  );

  const desktopFiltersControl = (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="icon"
            className="size-11 rounded-full"
            aria-label="Open filters"
          />
        }
      >
        <SlidersHorizontal className="size-4.5" />
      </PopoverTrigger>
      <PopoverContent>{filterContent}</PopoverContent>
    </Popover>
  );

  const mobileFiltersControl = (
    <Button
      variant="outline"
      size="icon"
      className="size-11 rounded-full"
      onClick={() => setMobileFiltersOpen(true)}
      aria-label="Open filters"
    >
      <SlidersHorizontal className="size-4.5" />
    </Button>
  );

  return (
    <MapProvider>
      <div className="relative h-[calc(100vh-3.5rem)] min-h-[720px] overflow-hidden bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.12),_transparent_28%),linear-gradient(180deg,_hsl(var(--primary)/0.08)_0%,_hsl(var(--background))_42%,_hsl(var(--background))_100%)]">
        <div className="absolute right-4 top-4 z-30 hidden flex-wrap items-center gap-2 lg:flex">
          <Link
            href="/explore/submit"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "rounded-full bg-card/90",
            )}
          >
            <MapPinned className="mr-2 size-4" />
            Submit a site
          </Link>
          {session.status === "signed_in" ? (
            <Link
              href="/explore/submissions"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "rounded-full bg-card/90",
              )}
            >
              My submissions
            </Link>
          ) : null}
          {session.hasPermission("explore.moderate") ? (
            <Link
              href="/moderation/explore-sites"
              className={cn(buttonVariants(), "rounded-full")}
            >
              <Gavel className="mr-2 size-4" />
              Review pending
            </Link>
          ) : null}
        </div>
        <div className="hidden h-full lg:grid lg:grid-cols-[460px_minmax(0,1fr)]">
          <ExploreResultsPanel
            q={state.q}
            total={exploreQuery.data?.total ?? 0}
            loading={exploreQuery.isLoading}
            fetching={exploreQuery.isFetching}
            spots={sortedItems}
            selectedSpotId={state.selectedSpotId}
            searchInputRef={searchInputRef}
            filtersControl={desktopFiltersControl}
            onQueryChange={setQuery}
            onSelectSpot={handleSelectSpot}
            sort={sort}
            onSortChange={setSort}
            onResetFilters={handleResetFilters}
            renderSpotActions={renderSpotActions}
          />

          <div className="relative h-full">
            <ExploreMap
              spots={sortedItems}
              selectedSpotId={state.selectedSpotId}
              searchBounds={state.bounds}
              initialCamera={state.camera}
              onBoundsChange={boundsState.updateDraftBounds}
              onCameraChange={setCamera}
              onSelectSpot={handleSelectSpot}
            />

            <div className="desktop-view pointer-events-none absolute inset-x-0 top-5 flex justify-center">
              <Button
                variant="secondary"
                className={`pointer-events-auto rounded-full px-5 shadow-xl transition-opacity ${boundsState.isDirty ? "opacity-100" : "pointer-events-none opacity-0"}`}
                onClick={handleApplyAreaSearch}
              >
                <Compass className="mr-2 size-4" />
                Search this area
              </Button>
            </div>

            <div className="absolute bottom-5 left-5 flex flex-wrap gap-2">
              {state.minRating ? (
                <Badge className="rounded-full bg-card/90 px-3 py-1 text-foreground shadow">
                  {state.minRating.toFixed(1)}+ rated
                </Badge>
              ) : null}
              {state.tags.map((tag) => (
                <Badge
                  key={tag}
                  className="rounded-full bg-card/90 px-3 py-1 text-foreground shadow"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <Tabs
          value={state.view}
          className="relative flex h-full flex-col gap-0 lg:hidden"
        >
          <div
            className={cn(
              "pointer-events-none absolute inset-x-0 top-2 z-20 px-4",
              state.view === "list" && "hidden",
            )}
          >
            <Card className="pointer-events-auto border-border/80 bg-transparent p-3 shadow-xl backdrop-blur">
              <div className="flex items-center gap-2">
                <Input
                  ref={searchInputRef}
                  value={state.q}
                  autoFocus
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search dive spots"
                  aria-label="Search dive spots"
                  className="h-11 rounded-full bg-muted/40"
                />
                {mobileFiltersControl}
              </div>
            </Card>

            <div className="mobile-view pointer-events-none px-4 w-full flex justify-center">
              <div className="pointer-events-auto">
                {boundsState.isDirty ? (
                  <Button
                    className="mt-3 rounded-full"
                    variant="secondary"
                    onClick={handleApplyAreaSearch}
                  >
                    Search this area
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
          <TabsList className="hidden" />

          <TabsContent value="map" className="mt-0 flex-1">
            <div className="relative h-full pt-0">
              <ExploreMap
                spots={sortedItems}
                selectedSpotId={state.selectedSpotId}
                searchBounds={state.bounds}
                initialCamera={state.camera}
                onBoundsChange={boundsState.updateDraftBounds}
                onCameraChange={setCamera}
                onSelectSpot={handleSelectSpot}
              />

              {selectedSpot ? (
                <div className="pointer-events-none absolute inset-x-0 bottom-34 z-20 px-4">
                  <div className="pointer-events-auto">
                    <DiveSpotCard
                      spot={selectedSpot}
                      selected
                      onSelect={handleSelectSpot}
                      onClose={() => setSelectedSpot(null)}
                      actions={renderSpotActions(selectedSpot)}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </TabsContent>

          <TabsContent value="list" className="mt-0 min-h-0 flex-1">
            <ExploreResultsPanel
              q={state.q}
              total={exploreQuery.data?.total ?? 0}
              loading={exploreQuery.isLoading}
              fetching={exploreQuery.isFetching}
              spots={sortedItems}
              selectedSpotId={state.selectedSpotId}
              filtersControl={mobileFiltersControl}
              onQueryChange={setQuery}
              onSelectSpot={handleSelectSpot}
              sort={sort}
              onSortChange={setSort}
              onResetFilters={handleResetFilters}
              className="border-r-0"
              compactControls
              showSearchControls={true}
              renderSpotActions={renderSpotActions}
            />
          </TabsContent>
        </Tabs>

        <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
          <SheetContent side="bottom" className="rounded-t-[32px] pb-8">
            <SheetHeader className="px-4 pb-2">
              <SheetTitle>Filters</SheetTitle>
              <SheetDescription>
                Refine the map and list with shared query state.
              </SheetDescription>
            </SheetHeader>
            <div className="px-4">{filterContent}</div>
          </SheetContent>
        </Sheet>
      </div>
      <div className="relative">
        <div className="pointer-events-none fixed lg:hidden inset-x-0 bottom-20 z-50 flex justify-center px-4">
          <ExploreMobileToggle view={state.view} onChange={setView} />
        </div>
      </div>
    </MapProvider>
  );
}

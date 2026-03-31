"use client";

import Link from "next/link";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Compass,
  ExternalLink,
  Gavel,
  Heart,
  MapPinned,
  Share2,
} from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { MapProvider } from "@/providers/map-provider";
import { useSidebar } from "@/components/ui/sidebar";
import { useSession } from "@/features/auth/session";

import { exploreApi } from "../api/exploreApi";
import { exploreApi as exploreWriteApi } from "@/features/diveSpots/api/explore-v1";
import { useMapBounds } from "../hooks/useMapBounds";
import { useExploreQueryState } from "../hooks/useExploreQueryState";
import {
  EXPLORE_DEFAULT_LIMIT,
  type DiveSpot,
  getDiveSpotSlug,
} from "../types";
import { DiveSpotCard } from "./DiveSpotCard";
import { ExploreMap } from "./ExploreMap";
import { ExploreMobileToggle } from "./ExploreMobileToggle";
import { ExploreResultsPanel } from "./ExploreResultsPanel";

type SortMode = "relevance" | "recent";

const sortItems = (items: DiveSpot[], sort: SortMode) => {
  switch (sort) {
    case "recent":
      return [...items].sort(
        (left, right) => right.recentUpdateCount - left.recentUpdateCount,
      );
    default:
      return items;
  }
};

export function ExploreLayout() {
  const session = useSession();
  const queryClient = useQueryClient();
  const { setOpen, setOpenMobile } = useSidebar();
  const didForceSidebarCloseRef = useRef(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [sort, setSort] = useState<SortMode>("relevance");

  const {
    state,
    resetFilters,
    setBounds,
    setCamera,
    setQuery,
    setSelectedSpot,
    setView,
  } = useExploreQueryState();

  const deferredQuery = useDeferredValue(state.q);
  const boundsState = useMapBounds(state.bounds);

  const exploreQuery = useInfiniteQuery({
    queryKey: [
      "explore",
      {
        q: deferredQuery,
        bounds: state.bounds,
        limit: EXPLORE_DEFAULT_LIMIT,
      },
    ],
    queryFn: ({ pageParam }: { pageParam?: string }) =>
      exploreApi.searchDiveSpots({
        q: deferredQuery,
        bounds: state.bounds,
        limit: EXPLORE_DEFAULT_LIMIT,
        cursor: pageParam,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
  });
  const saveSiteMutation = useMutation({
    mutationFn: async ({ siteId, isSaved }: { siteId: string; isSaved: boolean }) => {
      if (isSaved) {
        await exploreWriteApi.unsaveSite(siteId);
        return;
      }
      await exploreWriteApi.saveSite(siteId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["explore"] });
    },
  });
  const exploreItems =
    exploreQuery.data?.pages.flatMap((page) => page.items) ?? [];

  const sortedItems = useMemo(
    () => sortItems(exploreItems, sort),
    [exploreItems, sort],
  );
  const selectedSpot =
    sortedItems.find((spot) => spot.id === state.selectedSpotId) ?? null;

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

  const shareSpot = async (spot: DiveSpot) => {
    const url = `${window.location.origin}/explore/sites/${getDiveSpotSlug(spot)}`;
    if (navigator.share) {
      await navigator.share({ title: spot.name, url });
      return;
    }

    await navigator.clipboard.writeText(url);
  };

  const renderSpotActions = (spot: DiveSpot) => {
    const isSaved = spot.isSaved;

    return (
      <>
        <Link href={`/explore/sites/${getDiveSpotSlug(spot)}`}>
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
        {session.status === "signed_in" ? (
          <Button
            size="sm"
            variant={isSaved ? "default" : "outline"}
            className="rounded-full"
            disabled={saveSiteMutation.isPending}
            onClick={() =>
              saveSiteMutation.mutate({
                siteId: spot.id,
                isSaved,
              })
            }
          >
            <Heart className={cn("mr-1.5 size-4", isSaved && "fill-current")} />
            {isSaved ? "Saved" : "Save"}
          </Button>
        ) : null}
      </>
    );
  };

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
            total={sortedItems.length}
            loading={exploreQuery.isPending}
            fetching={exploreQuery.isFetching}
            spots={sortedItems}
            selectedSpotId={state.selectedSpotId}
            hasNextPage={Boolean(exploreQuery.hasNextPage)}
            isFetchingNextPage={exploreQuery.isFetchingNextPage}
            searchInputRef={searchInputRef}
            filtersControl={null}
            onQueryChange={setQuery}
            onLoadMore={() => void exploreQuery.fetchNextPage()}
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
              total={sortedItems.length}
              loading={exploreQuery.isPending}
              fetching={exploreQuery.isFetching}
              spots={sortedItems}
              selectedSpotId={state.selectedSpotId}
              hasNextPage={Boolean(exploreQuery.hasNextPage)}
              isFetchingNextPage={exploreQuery.isFetchingNextPage}
              filtersControl={null}
              onQueryChange={setQuery}
              onLoadMore={() => void exploreQuery.fetchNextPage()}
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
      </div>
      <div className="relative">
        <div className="pointer-events-none fixed lg:hidden inset-x-0 bottom-20 z-50 flex justify-center px-4">
          <ExploreMobileToggle view={state.view} onChange={setView} />
        </div>
      </div>
    </MapProvider>
  );
}

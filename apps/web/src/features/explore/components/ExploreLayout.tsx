"use client";

import Link from "next/link";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Bookmark,
  Compass,
  ExternalLink,
  Gavel,
  LoaderCircle,
  MapPin,
  MapPinned,
  Share2,
  Users,
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
  type ExploreSortMode,
  getDiveSpotSlug,
} from "../types";
import { DiveSpotCard } from "./DiveSpotCard";
import { DiveSiteLikeButton } from "./DiveSiteLikeButton";
import { ExploreMap } from "./ExploreMap";
import { ExploreMobileToggle } from "./ExploreMobileToggle";
import { ExploreResultsPanel } from "./ExploreResultsPanel";

const sortItems = (items: DiveSpot[], sort: ExploreSortMode) => {
  switch (sort) {
    case "recent":
      return [...items].sort(
        (left, right) => right.recentUpdateCount - left.recentUpdateCount,
      );
    default:
      return items;
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

export function ExploreLayout() {
  const session = useSession();
  const queryClient = useQueryClient();
  const { setOpen, setOpenMobile } = useSidebar();
  const didForceSidebarCloseRef = useRef(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [sort, setSort] = useState<ExploreSortMode>("default");

  const {
    state,
    resetFilters,
    setArea,
    setBounds,
    setCamera,
    setDifficulty,
    setQuery,
    setSavedOnly,
    setSelectedSpot,
    setVerifiedOnly,
    setView,
  } = useExploreQueryState();

  const deferredQuery = useDeferredValue(state.q);
  const boundsState = useMapBounds(state.bounds);
  const savedOnlyRequiresSignIn =
    state.savedOnly && session.status === "signed_out";
  const savedOnlyWaitingForSession =
    state.savedOnly && session.status === "loading";
  const canQueryExplore =
    !savedOnlyRequiresSignIn && !savedOnlyWaitingForSession;

  const exploreQuery = useInfiniteQuery({
    queryKey: [
      "explore",
      {
        q: deferredQuery,
        area: state.area,
        difficulty: state.difficulty,
        verifiedOnly: state.verifiedOnly,
        savedOnly: state.savedOnly,
        bounds: state.bounds,
        limit: EXPLORE_DEFAULT_LIMIT,
      },
    ],
    queryFn: ({ pageParam }: { pageParam?: string }) =>
      exploreApi.searchDiveSpots({
        q: deferredQuery,
        area: state.area || undefined,
        difficulty: state.difficulty === "all" ? undefined : state.difficulty,
        verifiedOnly: state.verifiedOnly || undefined,
        savedOnly: state.savedOnly || undefined,
        bounds: state.bounds,
        limit: EXPLORE_DEFAULT_LIMIT,
        cursor: pageParam,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
    enabled: canQueryExplore,
  });
  const saveSiteMutation = useMutation({
    mutationFn: async ({
      siteId,
      isSaved,
    }: { siteId: string; isSaved: boolean }) => {
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
    savedOnlyRequiresSignIn || savedOnlyWaitingForSession
      ? []
      : (exploreQuery.data?.pages.flatMap((page) => page.items) ?? []);

  const sortedItems = useMemo(
    () => sortItems(exploreItems, sort),
    [exploreItems, sort],
  );
  const areaOptions = useMemo(() => {
    const options = new Set<string>();
    for (const spot of exploreItems) {
      const area = spot.area.trim();
      if (area) options.add(area);
    }
    if (state.area) options.add(state.area);
    return Array.from(options).sort((left, right) => left.localeCompare(right));
  }, [exploreItems, state.area]);
  const selectedSpot =
    sortedItems.find((spot) => spot.id === state.selectedSpotId) ?? null;
  const exploreErrorMessage = exploreQuery.isError
    ? "Could not load dive spots."
    : undefined;
  const hasAppliedBounds = Boolean(state.bounds);
  const isAreaSearchFetching =
    hasAppliedBounds &&
    exploreQuery.isFetching &&
    !exploreQuery.isFetchingNextPage;
  const showAreaSearchStatus = boundsState.isDirty || isAreaSearchFetching;

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
          <Button size="xs" className="rounded-full px-2.5">
            <ExternalLink className="mr-1 size-3.5" />
            Open site
          </Button>
        </Link>
        <Button
          size="icon-xs"
          variant="ghost"
          tooltip={`Share ${spot.name}`}
          aria-label={`Share ${spot.name}`}
          onClick={() => void shareSpot(spot)}
        >
          <Share2 className="size-3.5" />
        </Button>
        <DiveSiteLikeButton
          siteId={spot.id}
          likeCount={spot.likeCount}
          viewerHasLiked={spot.viewerHasLiked}
        />
        {session.status === "signed_in" ? (
          <Button
            size="icon-xs"
            variant={isSaved ? "secondary" : "ghost"}
            tooltip={isSaved ? `Unsave ${spot.name}` : `Save ${spot.name}`}
            aria-label={isSaved ? `Unsave ${spot.name}` : `Save ${spot.name}`}
            disabled={saveSiteMutation.isPending}
            onClick={() =>
              saveSiteMutation.mutate({
                siteId: spot.id,
                isSaved,
              })
            }
          >
            <Bookmark className={cn("size-3.5", isSaved && "fill-current")} />
          </Button>
        ) : null}
      </>
    );
  };

  return (
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
          area={state.area}
          areaOptions={areaOptions}
          difficulty={state.difficulty}
          verifiedOnly={state.verifiedOnly}
          savedOnly={state.savedOnly}
          canUseSavedFilter={session.status === "signed_in"}
          savedOnlyRequiresSignIn={savedOnlyRequiresSignIn}
          total={sortedItems.length}
          loading={exploreQuery.isPending || savedOnlyWaitingForSession}
          fetching={exploreQuery.isFetching}
          hasAppliedBounds={hasAppliedBounds}
          errorMessage={exploreErrorMessage}
          spots={sortedItems}
          selectedSpotId={state.selectedSpotId}
          hasNextPage={Boolean(exploreQuery.hasNextPage)}
          isFetchingNextPage={exploreQuery.isFetchingNextPage}
          searchInputRef={searchInputRef}
          onQueryChange={setQuery}
          onAreaChange={setArea}
          onDifficultyChange={setDifficulty}
          onVerifiedOnlyChange={setVerifiedOnly}
          onSavedOnlyChange={setSavedOnly}
          onLoadMore={() => void exploreQuery.fetchNextPage()}
          onSelectSpot={handleSelectSpot}
          sort={sort}
          onSortChange={setSort}
          onResetFilters={handleResetFilters}
          renderSpotActions={renderSpotActions}
        />

        <div className="relative h-full">
          <MapProvider>
            <ExploreMap
              spots={sortedItems}
              selectedSpotId={state.selectedSpotId}
              searchBounds={state.bounds}
              initialCamera={state.camera}
              onBoundsChange={boundsState.updateDraftBounds}
              onCameraChange={setCamera}
              onSelectSpot={handleSelectSpot}
            />
          </MapProvider>
          {!savedOnlyRequiresSignIn &&
          !savedOnlyWaitingForSession &&
          !exploreQuery.isPending &&
          sortedItems.length === 0 ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-8 flex justify-center px-6">
              <Card className="pointer-events-auto max-w-md border-border/80 bg-card/95 p-4 text-sm shadow-xl">
                <p className="font-medium text-foreground">
                  Try another part of the coast
                </p>
                <p className="mt-1 text-muted-foreground">
                  Move the map, search a nearby town, or suggest a dive site if
                  this area should be listed.
                </p>
              </Card>
            </div>
          ) : null}

          {selectedSpot ? (
            <div className="pointer-events-none absolute bottom-5 left-5 z-20 w-[320px]">
              <Card className="pointer-events-auto border-border/80 bg-card/95 p-4 shadow-xl">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-sm font-semibold text-foreground">
                      {selectedSpot.name}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="size-3.5" />
                      {selectedSpot.area}
                    </p>
                  </div>
                  <Link
                    href={`/explore/sites/${getDiveSpotSlug(selectedSpot)}`}
                  >
                    <Button size="xs" className="rounded-full">
                      Open site
                    </Button>
                  </Link>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Badge variant="secondary" className="rounded-full text-xs">
                    {difficultyLabel(selectedSpot.difficulty)}
                  </Badge>
                  <Badge variant="outline" className="rounded-full text-xs">
                    {verificationLabel(selectedSpot.verificationStatus)}
                  </Badge>
                  {selectedSpot.buddySignal ? (
                    <Badge variant="outline" className="rounded-full text-xs">
                      <Users className="mr-1 size-3.5" />
                      {selectedSpot.buddySignal.label}
                    </Badge>
                  ) : null}
                </div>
              </Card>
            </div>
          ) : null}

          <div className="desktop-view pointer-events-none absolute inset-x-0 top-5 flex justify-center">
            <Button
              variant="secondary"
              className={`pointer-events-auto rounded-full px-5 shadow-xl transition-opacity ${showAreaSearchStatus ? "opacity-100" : "pointer-events-none opacity-0"}`}
              aria-label="Search this map area"
              disabled={isAreaSearchFetching}
              onClick={handleApplyAreaSearch}
            >
              {isAreaSearchFetching ? (
                <LoaderCircle className="mr-2 size-4 animate-spin" />
              ) : (
                <Compass className="mr-2 size-4" />
              )}
              {isAreaSearchFetching
                ? "Searching this area"
                : "Search this area"}
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
                placeholder="Search by site, town, or area"
                aria-label="Search by site, town, or area"
                className="h-11 rounded-full bg-muted/40"
              />
            </div>
          </Card>

          <div className="mobile-view pointer-events-none px-4 w-full flex justify-center">
            <div className="pointer-events-auto">
              {showAreaSearchStatus ? (
                <Button
                  className="mt-3 rounded-full"
                  variant="secondary"
                  aria-label="Search this map area"
                  disabled={isAreaSearchFetching}
                  onClick={handleApplyAreaSearch}
                >
                  {isAreaSearchFetching ? (
                    <LoaderCircle className="mr-2 size-4 animate-spin" />
                  ) : null}
                  {isAreaSearchFetching
                    ? "Searching this area"
                    : "Search this area"}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
        <TabsList className="hidden" />

        <TabsContent value="map" className="mt-0 flex-1">
          <div className="relative h-full pt-0">
            <MapProvider>
              <ExploreMap
                spots={sortedItems}
                selectedSpotId={state.selectedSpotId}
                searchBounds={state.bounds}
                initialCamera={state.camera}
                onBoundsChange={boundsState.updateDraftBounds}
                onCameraChange={setCamera}
                onSelectSpot={handleSelectSpot}
              />
            </MapProvider>
            {!exploreQuery.isPending &&
            !savedOnlyRequiresSignIn &&
            !savedOnlyWaitingForSession &&
            sortedItems.length === 0 &&
            !selectedSpot ? (
              <div className="pointer-events-none absolute inset-x-0 bottom-34 z-20 px-4">
                <Card className="pointer-events-auto border-border/80 bg-card/95 p-4 text-sm shadow-xl">
                  <p className="font-medium text-foreground">
                    Try another part of the coast
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    Move the map, search a nearby town, or suggest a dive site
                    if this area should be listed.
                  </p>
                </Card>
              </div>
            ) : null}

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
            area={state.area}
            areaOptions={areaOptions}
            difficulty={state.difficulty}
            verifiedOnly={state.verifiedOnly}
            savedOnly={state.savedOnly}
            canUseSavedFilter={session.status === "signed_in"}
            savedOnlyRequiresSignIn={savedOnlyRequiresSignIn}
            total={sortedItems.length}
            loading={exploreQuery.isPending || savedOnlyWaitingForSession}
            fetching={exploreQuery.isFetching}
            hasAppliedBounds={hasAppliedBounds}
            errorMessage={exploreErrorMessage}
            spots={sortedItems}
            selectedSpotId={state.selectedSpotId}
            hasNextPage={Boolean(exploreQuery.hasNextPage)}
            isFetchingNextPage={exploreQuery.isFetchingNextPage}
            onQueryChange={setQuery}
            onAreaChange={setArea}
            onDifficultyChange={setDifficulty}
            onVerifiedOnlyChange={setVerifiedOnly}
            onSavedOnlyChange={setSavedOnly}
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
      <div className="relative">
        <div className="pointer-events-none fixed lg:hidden inset-x-0 bottom-20 z-50 flex justify-center px-4">
          <ExploreMobileToggle view={state.view} onChange={setView} />
        </div>
      </div>
    </div>
  );
}

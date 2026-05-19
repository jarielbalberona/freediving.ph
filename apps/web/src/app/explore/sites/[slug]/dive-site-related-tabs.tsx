"use client";

import { useState } from "react";

import type {
  ActivityFeedItem,
  BuddyFinderPreviewIntent,
  ExploreSiteBuddySourceBreakdown,
  ExploreSiteRelatedCounts,
} from "@freediving.ph/types";

import { TrustCard } from "@/components/trust-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { exploreApi } from "@/features/diveSpots/api/explore-v1";
import { activityToHomeFeedItems } from "@/features/home-feed/adapters/activity-to-home-feed";
import { FeedItemRenderer } from "@/features/home-feed/components/FeedItemRenderer";

type DiveSiteRelatedTabsProps = {
  siteId: string;
  slug: string;
  counts: ExploreSiteRelatedCounts;
  buddySourceBreakdown: ExploreSiteBuddySourceBreakdown;
  buddyPreview: BuddyFinderPreviewIntent[];
  communityPosts: ActivityFeedItem[];
  communityNextCursor?: string;
};

const titleCase = (value: string) =>
  value
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");

export function DiveSiteRelatedTabs({
  siteId,
  slug,
  counts,
  buddySourceBreakdown,
  buddyPreview,
  communityPosts,
  communityNextCursor,
}: DiveSiteRelatedTabsProps) {
  const [communityFeed, setCommunityFeed] = useState(communityPosts);
  const [nextCursor, setNextCursor] = useState(communityNextCursor);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState("");
  const communityItems = activityToHomeFeedItems(communityFeed);
  const buddyCount =
    counts.buddies ||
    buddySourceBreakdown.siteLinkedCount + buddySourceBreakdown.areaFallbackCount;

  const loadMoreCommunityPosts = async () => {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    setLoadError("");
    try {
      const page = await exploreApi.getSiteCommunityPosts(slug, nextCursor);
      setCommunityFeed((current) => {
        const existing = new Set(current.map((item) => item.id));
        const nextItems = page.items.filter((item) => !existing.has(item.id));
        return [...current, ...nextItems];
      });
      setNextCursor(page.nextCursor);
    } catch {
      setLoadError("Could not load more community posts.");
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <Tabs defaultValue="buddies" className="space-y-4">
      <TabsList className="w-full justify-start overflow-x-auto">
        <TabsTrigger value="buddies">Buddies ({buddyCount})</TabsTrigger>
        <TabsTrigger value="community">
          Community posts ({counts.communityPosts})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="buddies" className="space-y-3">
        {buddyPreview.length === 0 ? (
          <Card size="sm" className="border-dashed">
            <CardContent className="text-sm text-muted-foreground">
              No buddy posts for this spot yet.
            </CardContent>
          </Card>
        ) : (
          buddyPreview.map((intent) => (
            <Card key={intent.id} size="sm">
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="flex flex-wrap gap-2">
                  <Badge>{titleCase(intent.intentType)}</Badge>
                  <Badge variant="outline">{titleCase(intent.timeWindow)}</Badge>
                </div>
                <p>
                  {intent.notePreview ||
                    "Create an account to view full buddy details and message."}
                </p>
                <div className="flex flex-wrap gap-2 text-xs">
                  {intent.diveSiteId === siteId ? (
                    <span>Linked to this site</span>
                  ) : (
                    <span>Near this area</span>
                  )}
                </div>
                <TrustCard
                  emailVerified={intent.emailVerified}
                  phoneVerified={intent.phoneVerified}
                  certLevel={intent.certLevel}
                  buddyCount={intent.buddyCount}
                  reportCount={intent.reportCount}
                />
              </CardContent>
            </Card>
          ))
        )}
      </TabsContent>

      <TabsContent value="community" className="space-y-3">
        {communityItems.length === 0 ? (
          <Card size="sm" className="border-dashed">
            <CardContent className="text-sm text-muted-foreground">
              No community posts tagged to this spot yet.
            </CardContent>
          </Card>
        ) : (
          communityItems.map((item, index) => (
            <FeedItemRenderer
              key={item.id}
              item={item}
              position={index}
              onAction={() => undefined}
              showActions={false}
            />
          ))
        )}
        {loadError ? (
          <p className="text-sm text-destructive">{loadError}</p>
        ) : null}
        {nextCursor ? (
          <div className="flex justify-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={loadMoreCommunityPosts}
              disabled={isLoadingMore}
            >
              {isLoadingMore ? "Loading..." : "Load more"}
            </Button>
          </div>
        ) : null}
      </TabsContent>
    </Tabs>
  );
}

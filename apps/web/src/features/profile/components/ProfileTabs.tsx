"use client";

import { useState } from "react";
import { Bookmark, Clapperboard, Grid3X3, Tag } from "lucide-react";

import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileGrid } from "@/features/profile/components/ProfileGrid";
import type { ProfileMediaItem } from "@freediving.ph/types";

type ProfileTabsProps = {
  mediaItems: ProfileMediaItem[];
  isLoadingMedia: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  username: string;
  displayName: string;
  avatarUrl?: string;
};

function PlaceholderPanel({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center gap-3 text-center">
      <p className="text-base font-semibold text-foreground">{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export function ProfileTabs({
  mediaItems,
  isLoadingMedia,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  username,
  displayName,
  avatarUrl,
}: ProfileTabsProps) {
  const [tab, setTab] = useState("grid");

  return (
    <section className="space-y-0">
      <Separator />
      <Tabs value={tab} onValueChange={setTab} className="gap-0">
          <TabsList
            variant="line"
            className="grid w-full h-12! grid-cols-4 gap-0 rounded-none px-0"
          >
            <TabsTrigger
              value="grid"
              className="rounded-none py-3 text-xs uppercase tracking-[0.18em]"
            >
              <Grid3X3 className="size-4" />
              <span className="hidden sm:inline">Grid</span>
            </TabsTrigger>
            <TabsTrigger
              value="videos"
              className="rounded-none py-3 text-xs uppercase tracking-[0.18em]"
            >
              <Clapperboard className="size-4" />
              <span className="hidden sm:inline">Videos</span>
            </TabsTrigger>
            <TabsTrigger
              value="saved"
              className="rounded-none py-3 text-xs uppercase tracking-[0.18em]"
            >
              <Bookmark className="size-4" />
              <span className="hidden sm:inline">Saved</span>
            </TabsTrigger>
            <TabsTrigger
              value="tagged"
              className="rounded-none py-3 text-xs uppercase tracking-[0.18em]"
            >
              <Tag className="size-4" />
              <span className="hidden sm:inline">Tagged</span>
            </TabsTrigger>
          </TabsList>

        <TabsContent value="grid" className="pt-2 px-1">
          <ProfileGrid
            items={mediaItems}
            isLoading={isLoadingMedia}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            onLoadMore={onLoadMore}
            username={username}
            displayName={displayName}
            avatarUrl={avatarUrl}
          />
        </TabsContent>
        <TabsContent value="videos" className="pt-4">
          <PlaceholderPanel
            title="Videos coming soon"
            description="Reels-style profile video playback is not wired yet."
          />
        </TabsContent>
        <TabsContent value="saved" className="pt-4">
          <PlaceholderPanel
            title="Saved coming soon"
            description="Private saved profile collections will land after the grid flow is stable."
          />
        </TabsContent>
        <TabsContent value="tagged" className="pt-4">
          <PlaceholderPanel
            title="Tagged coming soon"
            description="Tagged post discovery is a placeholder until that feed contract exists."
          />
        </TabsContent>
      </Tabs>
    </section>
  );
}

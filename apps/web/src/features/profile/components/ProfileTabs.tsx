"use client";

import { useState } from "react";
import {
  Bookmark,
  Clapperboard,
  Grid3X3,
  Tag,
} from "lucide-react";

import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileGrid } from "@/features/profile/components/ProfileGrid";
import type { ProfilePost } from "@/features/profile/types";

type ProfileTabsProps = {
  posts: ProfilePost[];
  isLoadingPosts: boolean;
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
    <div className="flex min-h-72 flex-col items-center justify-center gap-2 rounded-[2rem] border border-dashed border-border bg-muted/20 text-center">
      <p className="text-base font-semibold text-foreground">{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export function ProfileTabs({
  posts,
  isLoadingPosts,
  username,
  displayName,
  avatarUrl,
}: ProfileTabsProps) {
  const [tab, setTab] = useState("grid");

  return (
    <section className="space-y-0">
      <Separator />
      <Tabs value={tab} onValueChange={setTab} className="gap-0">
        <div className="sticky top-14 z-10 bg-background/95 backdrop-blur">
          <TabsList
            variant="line"
            className="grid w-full grid-cols-4 gap-0 rounded-none px-0"
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
        </div>

        <TabsContent value="grid" className="pt-1">
          <ProfileGrid
            posts={posts}
            isLoading={isLoadingPosts}
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

"use client";

import { Separator } from "@/components/ui/separator";
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
  return (
    <section className="space-y-0">
      <Separator />
      <div className="px-1 pt-2">
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
      </div>
    </section>
  );
}

"use client";

import type { DiveSpotHighlight, ProfileMediaItem } from "@freediving.ph/types";
import { ImageIcon, LoaderCircle } from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import {
  MediaViewerDialog,
  type MediaViewerDialogItem,
} from "@/features/media/components/MediaViewerDialog";
import { MediaPostSocialPanel } from "@/features/media/components/MediaPostSocialPanel";
import {
  useDiveSpotHighlightMediaInfiniteQuery,
  useDiveSpotHighlights,
} from "@/features/media/hooks";
import { cn } from "@/lib/utils";

type DiveSpotHighlightsProps = {
  username: string;
  displayName: string;
  avatarUrl?: string;
};

const getDisplayCaption = (item: ProfileMediaItem): string | null =>
  item.postCaption?.trim() || item.caption?.trim() || null;

export function DiveSpotHighlights({
  username,
  displayName,
  avatarUrl,
}: DiveSpotHighlightsProps) {
  const highlightsQuery = useDiveSpotHighlights(username);
  const [selectedHighlight, setSelectedHighlight] =
    useState<DiveSpotHighlight | null>(null);

  const mediaQuery = useDiveSpotHighlightMediaInfiniteQuery(
    username,
    selectedHighlight?.diveSpotId ?? null,
    60,
    selectedHighlight != null,
  );

  const mediaItems = useMemo(
    () => mediaQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [mediaQuery.data?.pages],
  );

  const viewerItems: MediaViewerDialogItem[] = mediaItems
    .filter((item) => item.width > 0 && item.height > 0)
    .map((item) => ({
      id: item.id,
      mediaObjectId: item.mediaObjectId,
      width: item.width,
      height: item.height,
      caption: getDisplayCaption(item),
      alt: getDisplayCaption(item) || `${username} photo at ${item.diveSite.name}`,
    }));

  const highlights = highlightsQuery.data?.items ?? [];

  if (highlightsQuery.isPending) {
    return (
      <section className="space-y-3 px-4">
        <h2 className="text-sm font-semibold text-foreground">
          Dive Spot Highlights
        </h2>
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={`dive-spot-highlight-skeleton-${index + 1}`}
              className="w-20 shrink-0 space-y-2"
            >
              <Skeleton className="mx-auto size-16 rounded-full" />
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (highlights.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3 px-4">
      <h2 className="text-sm font-semibold text-foreground">
        Dive Spot Highlights
      </h2>
      <div className="-mx-4 overflow-x-auto px-4 pb-1">
        <div className="flex min-w-0 gap-4">
          {highlights.map((highlight) => (
            <DiveSpotHighlightItem
              key={highlight.diveSpotId}
              highlight={highlight}
              isSelected={selectedHighlight?.diveSpotId === highlight.diveSpotId}
              onClick={() => setSelectedHighlight(highlight)}
            />
          ))}
        </div>
      </div>

      <MediaViewerDialog
        items={viewerItems}
        open={selectedHighlight != null}
        initialIndex={0}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedHighlight(null);
          }
        }}
        renderSidebar={(activeItem) => {
          const selectedItem =
            mediaItems.find((item) => item.id === activeItem.id) ?? null;
          if (!selectedItem) {
            return (
              <div className="flex min-h-40 items-center justify-center">
                <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
              </div>
            );
          }
          const caption = getDisplayCaption(selectedItem);

          return (
            <MediaPostSocialPanel
              postId={selectedItem.postId}
              href={`/${username}/posts/${selectedItem.postId}`}
              authorName={displayName}
              authorUsername={username}
              authorAvatarUrl={avatarUrl}
              diveSiteName={selectedItem.diveSite.name || selectedHighlight?.diveSpotName}
              diveSiteArea={selectedItem.diveSite.area || selectedHighlight?.diveSpotArea}
              diveSiteHref={
                selectedItem.diveSite.slug
                  ? `/explore/sites/${selectedItem.diveSite.slug}`
                  : undefined
              }
              caption={caption || "No caption added."}
              likeCount={selectedItem.likeCount}
              commentCount={selectedItem.commentCount}
              viewerHasLiked={selectedItem.viewerHasLiked}
              viewerHasSaved={selectedItem.viewerHasSaved}
              commentsScrollMode="desktop"
            />
          );
        }}
      />
    </section>
  );
}

function DiveSpotHighlightItem({
  highlight,
  isSelected,
  onClick,
}: {
  highlight: DiveSpotHighlight;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="grid w-20 shrink-0 justify-items-center gap-2 text-center outline-none"
      aria-label={`Open ${highlight.diveSpotName} Dive Spot Highlight`}
    >
      <span
        className={cn(
          "relative grid size-16 place-items-center overflow-hidden rounded-full border bg-muted text-muted-foreground transition",
          isSelected ? "border-primary ring-2 ring-primary/30" : "hover:border-primary/60",
        )}
      >
        {highlight.coverThumbnailUrl ? (
          <Image
            src={highlight.coverThumbnailUrl}
            alt=""
            fill
            sizes="64px"
            className="object-cover"
            unoptimized
          />
        ) : (
          <ImageIcon className="size-6" />
        )}
      </span>
      <span className="line-clamp-2 min-h-8 text-xs font-medium leading-4 text-foreground">
        {highlight.diveSpotName}
      </span>
      <span className="text-[11px] leading-none text-muted-foreground">
        {highlight.mediaCount}
      </span>
    </button>
  );
}

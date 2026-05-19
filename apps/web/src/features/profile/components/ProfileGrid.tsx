"use client";

import type { ProfileMediaItem } from "@freediving.ph/types";
import Image from "next/image";
import { useState } from "react";
import { ImageOff, LoaderCircle } from "lucide-react";
import { MasonryPhotoAlbum } from "react-photo-album";
import "react-photo-album/masonry.css";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MediaViewerDialog,
  type MediaViewerDialogItem,
} from "@/features/media/components/MediaViewerDialog";
import { MediaPostSocialPanel } from "@/features/media/components/MediaPostSocialPanel";
import { useMintedMediaMap } from "@/features/media/hooks";

type ProfileGridProps = {
  items: ProfileMediaItem[];
  isLoading: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  username: string;
  displayName: string;
  avatarUrl?: string;
};

type AlbumPhoto = {
  key: string;
  src: string;
  width: number;
  height: number;
  alt: string;
  mediaItem: ProfileMediaItem;
};

const getDisplayCaption = (item: ProfileMediaItem): string | null =>
  item.postCaption?.trim() || item.caption?.trim() || null;

export function ProfileGrid({
  items,
  isLoading,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  username,
  displayName,
  avatarUrl,
}: ProfileGridProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const validItems = items.filter((item) => item.width > 0 && item.height > 0);
  const galleryUrls = useMintedMediaMap(
    validItems.map((item) => item.mediaObjectId),
    "card",
    validItems.length > 0,
  );

  if (isLoading) {
    return (
      <div className="columns-2 gap-3 md:columns-3 xl:columns-4">
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton
            key={`profile-media-skeleton-${index + 1}`}
            className="mb-3 h-48 break-inside-avoid rounded-[0.5rem]"
          />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center gap-3 text-center">
        <ImageOff className="size-8 text-muted-foreground" />
        <div className="space-y-1">
          <p className="text-base font-semibold text-foreground">
            Photos will appear here
          </p>
          <p className="text-sm text-muted-foreground">
            When @{username} shares dive photos, they will appear here.
          </p>
        </div>
      </div>
    );
  }

  if (validItems.length === 0) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center gap-3 text-center">
        <ImageOff className="size-8 text-muted-foreground" />
        <div className="space-y-1">
          <p className="text-base font-semibold text-foreground">
            Some photos need a refresh
          </p>
          <p className="text-sm text-muted-foreground">
            A few older photos cannot be shown cleanly yet. New shared photos
            will appear normally.
          </p>
        </div>
      </div>
    );
  }

  const photos: AlbumPhoto[] = validItems
    .map((item) => {
      const src = galleryUrls.urlMap.get(item.mediaObjectId);
      if (!src) return null;
      const caption = getDisplayCaption(item);
      return {
        key: item.id,
        src,
        width: item.width,
        height: item.height,
        alt: caption || `${username} photo`,
        mediaItem: item,
      };
    })
    .filter((item): item is AlbumPhoto => item != null);
  const viewerItems: MediaViewerDialogItem[] = validItems.map((item) => ({
    id: item.id,
    mediaObjectId: item.mediaObjectId,
    width: item.width,
    height: item.height,
    caption: getDisplayCaption(item),
    alt: getDisplayCaption(item) || `${username} photo`,
  }));

  return (
    <div className="space-y-4">
      {galleryUrls.isPending && photos.length === 0 ? (
        <div className="columns-2 gap-3 md:columns-3 xl:columns-4">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton
              key={`profile-media-url-skeleton-${index + 1}`}
              className="mb-3 h-48 break-inside-avoid rounded-[0.5rem]"
            />
          ))}
        </div>
      ) : (
        <MasonryPhotoAlbum
          photos={photos}
          spacing={4}
          defaultContainerWidth={935}
          columns={(containerWidth) => {
            if (containerWidth < 640) return 2;
            if (containerWidth < 1024) return 3;
            return 4;
          }}
          onClick={({ index }) => setSelectedIndex(index)}
          render={{
            image: (props, { photo }) => (
              <div
                style={{ width: props.width, position: "relative" }}
                className="overflow-hidden rounded-[0.5rem] bg-muted/30"
              >
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  width={photo.width}
                  height={photo.height}
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="h-auto w-full object-cover transition-transform duration-200 hover:scale-[1.01]"
                  unoptimized
                />
              </div>
            ),
          }}
        />
      )}

      {hasNextPage ? (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            onClick={onLoadMore}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? (
              <>
                <LoaderCircle className="size-4 animate-spin" />
                Loading more
              </>
            ) : (
              "Load more photos"
            )}
          </Button>
        </div>
      ) : null}

      <MediaViewerDialog
        items={viewerItems}
        open={selectedIndex != null}
        initialIndex={selectedIndex ?? 0}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedIndex(null);
          }
        }}
        renderSidebar={(activeItem) => {
          const selectedItem =
            validItems.find((item) => item.id === activeItem.id) ?? null;
          if (!selectedItem) return null;
          const caption = getDisplayCaption(selectedItem);

          return (
            <MediaPostSocialPanel
              postId={selectedItem.postId}
              href={`/${username}/posts/${selectedItem.postId}`}
              authorName={displayName}
              authorUsername={username}
              authorAvatarUrl={avatarUrl}
              diveSiteName={selectedItem.diveSite.name || "Dive site unavailable"}
              diveSiteArea={selectedItem.diveSite.area || "Location unavailable"}
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
            />
          );
        }}
      />
    </div>
  );
}

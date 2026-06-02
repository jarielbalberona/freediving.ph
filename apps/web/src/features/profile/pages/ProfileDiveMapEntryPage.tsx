"use client";

import type {
  DiveMemory,
  DiveMemoriesPageMemoryItem,
  DiveMemoriesPageProofItem,
} from "@freediving.ph/types";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ImageOff, MapPin, MessageSquare, Plus } from "lucide-react";
import { MasonryPhotoAlbum } from "react-photo-album";
import "react-photo-album/masonry.css";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MediaViewerDialog } from "@/features/media/components/MediaViewerDialog";
import {
  MomentPlayer,
  momentPlaybackFromUrls,
} from "@/features/media/components/MomentPlayer";
import { ProfileDiveMemories } from "@/features/profile/components/ProfileDiveMemories";
import { useProfileDiveMemoriesPageQuery } from "@/features/profile/hooks/queries";
import {
  getDiveMemoriesCreateRoute,
  getProfileRoute,
  normalizeUsername,
} from "@/lib/routes";

type ProfileDiveMapEntryPageProps = {
  username: string;
  entrySlug: string;
};

type GalleryItem = {
  id: string;
  label: "Location post" | "Memory";
  kind: "location-post" | "memory";
  title: string;
  body?: string;
  createdAt: string;
  postHref?: string;
  viewerItem: {
    id: string;
    mediaObjectId: string;
    type: "photo" | "video";
    displayUrl?: string;
    playbackUrl?: string;
    thumbnailUrl?: string;
    width: number;
    height: number;
    caption?: string | null;
    alt: string;
  };
};

type AlbumPhoto = {
  key: string;
  src: string;
  width: number;
  height: number;
  alt: string;
  galleryIndex: number;
};

export default function ProfileDiveMapEntryPage({
  username,
  entrySlug,
}: ProfileDiveMapEntryPageProps) {
  const normalizedUsername = normalizeUsername(username);
  const pageQuery = useProfileDiveMemoriesPageQuery(
    normalizedUsername,
    entrySlug,
    Boolean(normalizedUsername && entrySlug),
  );

  if (pageQuery.isPending && !pageQuery.data) {
    return <EntryStatusCard title="Loading dive memories" />;
  }

  if (pageQuery.isError || !pageQuery.data) {
    return (
      <EntryStatusCard
        title="This dive page is unavailable"
        description="Memories from this location cannot be shown right now."
      />
    );
  }

  const { entry, memoryItems, profile, proofItems, site } = pageQuery.data;
  const isOwner = profile.viewerIsOwner;
  const galleryItems = buildGalleryItems(
    normalizedUsername,
    proofItems,
    memoryItems,
    site.name,
  );
  const postItems = toDiveMemories(memoryItems, site.diveSiteId);
  const memoryAttachmentsById = Object.fromEntries(
    memoryItems.map((item) => [item.id, item.attachments]),
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-5 md:px-6 md:py-6">
      <div className="space-y-5">
        <header className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <Button
              size="sm"
              variant="secondary"
              render={
                <Link href={`${getProfileRoute(normalizedUsername)}?tab=dive-memories`} />
              }
            >
              Back to Dive Memories
            </Button>
            {isOwner ? (
              <Button
                size="sm"
                render={
                  <Link
                    href={getDiveMemoriesCreateRoute(
                      normalizedUsername,
                      entrySlug,
                    )}
                  />
                }
              >
                <Plus className="h-4 w-4" />
                Share memory
              </Button>
            ) : null}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <MapPin className="h-4 w-4" />
              <span>{site.area}</span>
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                {site.name}
              </h1>
              <div className="flex flex-wrap gap-2 text-sm">
                <Badge variant="secondary">{entry.mediaCount} media</Badge>
                <Badge variant="secondary">{entry.memoryCount} memories</Badge>
                <Badge variant="outline">
                  Updated {formatShortDate(entry.lastUpdatedAt)}
                </Badge>
              </div>
            </div>
          </div>
        </header>

        <Tabs defaultValue="media" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 sm:w-fit">
            <TabsTrigger value="media">Media</TabsTrigger>
            <TabsTrigger value="memories">Memories</TabsTrigger>
          </TabsList>

          <TabsContent value="media" className="space-y-4">
            <div className="space-y-1">
              <h2 className="font-medium text-foreground text-sm">
                Photos and videos from this dive spot
              </h2>
            </div>
            <DiveMemoriesMediaGallery
              items={galleryItems}
              emptyTitle="No media shared here yet"
              emptyDescription={
                isOwner
                  ? "Location posts from this dive will show up here."
                  : "No visible photos or videos are available for this dive yet."
              }
            />
          </TabsContent>

          <TabsContent value="memories" className="space-y-4">
            <div className="">
              <ProfileDiveMemories
                username={normalizedUsername}
                isOwner={isOwner}
                filterDiveSiteId={site.diveSiteId}
                heading="Memories"
                items={postItems}
                attachmentsByMemoryId={memoryAttachmentsById}
                showHeadingIcon={false}
                headingClassName="font-medium text-foreground text-sm"
                showCreateComposer={false}
                showOwnerSummary={false}
                emptyOwnerTitle="Share a memory from this dive."
                emptyOwnerDescription="Start a post for this location."
                emptyVisitorTitle="No memories shared here yet."
                emptyVisitorDescription="Nothing public has been posted for this dive spot yet."
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function DiveMemoriesMediaGallery({
  items,
  emptyTitle,
  emptyDescription,
}: {
  items: GalleryItem[];
  emptyTitle: string;
  emptyDescription: string;
}) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const validItems = items.filter(
    (item) => item.viewerItem.width > 0 && item.viewerItem.height > 0,
  );
  const photoItems: AlbumPhoto[] = validItems
    .map((item, index) => {
      if (item.viewerItem.type === "video") return null;
      const src = item.viewerItem.displayUrl || item.viewerItem.thumbnailUrl;
      if (!src) return null;
      return {
        key: item.id,
        src,
        width: item.viewerItem.width,
        height: item.viewerItem.height,
        alt: item.viewerItem.alt,
        galleryIndex: index,
      };
    })
    .filter((item): item is AlbumPhoto => item != null);
  const videoItems = validItems.filter((item) => item.viewerItem.type === "video");

  if (items.length === 0) {
    return <EmptyPanel title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="space-y-4">
      {videoItems.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {videoItems.map((item) => {
            const playback = momentPlaybackFromUrls({
              playbackUrl: item.viewerItem.playbackUrl,
              posterUrl: item.viewerItem.thumbnailUrl,
            });
            return (
              <button
                key={item.id}
                type="button"
                className="group relative aspect-[9/16] overflow-hidden rounded-[1rem] bg-muted/30 text-left"
                onClick={() =>
                  setSelectedIndex(
                    validItems.findIndex((candidate) => candidate.id === item.id),
                  )
                }
              >
                <MomentPlayer
                  hlsUrl={playback.hlsUrl}
                  iframeUrl={playback.iframeUrl}
                  posterUrl={playback.posterUrl}
                  title={item.viewerItem.alt}
                  muted
                  controls={false}
                  playsInline
                  videoClassName="object-cover transition-transform duration-200 group-hover:scale-[1.01]"
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/90 via-background/35 to-transparent px-3 pb-3 pt-8">
                  <Badge variant="secondary">{item.label}</Badge>
                </div>
              </button>
            );
          })}
        </div>
      ) : null}

      {photoItems.length > 0 ? (
        <MasonryPhotoAlbum
          photos={photoItems}
          spacing={6}
          defaultContainerWidth={935}
          columns={(containerWidth) => {
            if (containerWidth < 640) return 2;
            if (containerWidth < 1024) return 3;
            return 4;
          }}
          onClick={({ photo }) => setSelectedIndex(photo.galleryIndex)}
          render={{
            image: (props, { photo }) => {
              const item = validItems[photo.galleryIndex];
              return (
                <div
                  style={{ width: props.width, position: "relative" }}
                  className="overflow-hidden rounded-[1rem] bg-muted/20"
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
                  {item ? (
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/90 via-background/35 to-transparent px-3 pb-3 pt-8">
                      <Badge variant="secondary">{item.label}</Badge>
                    </div>
                  ) : null}
                </div>
              );
            },
          }}
        />
      ) : null}

      {photoItems.length === 0 && videoItems.length === 0 ? (
        <EmptyPanel
          title="Media needs a refresh"
          description="Some older attachments are not ready to display cleanly yet."
        />
      ) : null}

      <MediaViewerDialog
        items={validItems.map((item) => item.viewerItem)}
        open={selectedIndex != null}
        initialIndex={selectedIndex ?? 0}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedIndex(null);
          }
        }}
        renderSidebar={(activeItem) => {
          const selectedItem =
            validItems.find((item) => item.viewerItem.id === activeItem.id) ??
            null;
          if (!selectedItem) return null;

          return (
            <div className="flex h-full flex-col gap-4 p-4">
              <div className="space-y-2">
                <Badge variant="secondary">{selectedItem.label}</Badge>
                <div className="space-y-1">
                  <h3 className="font-medium text-base text-foreground">
                    {selectedItem.title}
                  </h3>
                  {selectedItem.body ? (
                    <p className="text-muted-foreground text-sm leading-6">
                      {selectedItem.body}
                    </p>
                  ) : null}
                  <p className="text-muted-foreground text-xs">
                    {formatShortDate(selectedItem.createdAt)}
                  </p>
                </div>
              </div>
              {selectedItem.postHref ? (
                <div className="mt-auto">
                  <Button
                    type="button"
                    variant="outline"
                    render={<Link href={selectedItem.postHref} />}
                  >
                    Open post
                  </Button>
                </div>
              ) : null}
            </div>
          );
        }}
      />
    </div>
  );
}

function EntryStatusCard({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mx-auto max-w-3xl rounded-3xl border border-dashed border-border/70 bg-background/55 px-5 py-6 text-sm">
      <div className="space-y-1">
        <p className="font-medium text-foreground">{title}</p>
        {description ? (
          <p className="text-muted-foreground">{description}</p>
        ) : null}
      </div>
    </div>
  );
}

function EmptyPanel({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center gap-3 rounded-3xl bg-muted/10 px-5 text-center">
      <ImageOff className="size-8 text-muted-foreground" />
      <div className="space-y-1">
        <p className="font-medium text-foreground">{title}</p>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
    </div>
  );
}

function buildGalleryItems(
  username: string,
  proofItems: DiveMemoriesPageProofItem[],
  memoryItems: DiveMemoriesPageMemoryItem[],
  siteName: string,
): GalleryItem[] {
  const locationPosts = proofItems
    .filter((item) => item.media.url)
    .map((item) => ({
      id: item.id,
      label: "Location post" as const,
      kind: "location-post" as const,
      title: item.caption?.trim() || `${siteName} post`,
      body: undefined,
      createdAt: item.createdAt,
      postHref: `/${username}/posts/${item.postId}`,
      viewerItem: {
        id: item.id,
        mediaObjectId: item.mediaObjectId,
        type: item.media.type,
        displayUrl: item.media.type === "photo" ? item.media.url : undefined,
        playbackUrl: item.media.type === "video" ? item.media.url : undefined,
        thumbnailUrl: item.media.type === "photo" ? item.media.url : undefined,
        width: item.media.width,
        height: item.media.height,
        caption: item.caption,
        alt: item.caption?.trim() || `${siteName} post`,
      },
    }));

  const memoryMedia = memoryItems.flatMap((item) =>
    item.attachments
      .filter((attachment) => attachment.media.url)
      .map((attachment) => ({
        id: attachment.id,
        label: "Memory" as const,
        kind: "memory" as const,
        title: item.title?.trim() || "Memory",
        body: item.body?.trim() || undefined,
        createdAt: attachment.createdAt || item.createdAt,
        postHref: undefined,
        viewerItem: {
          id: attachment.id,
          mediaObjectId: attachment.mediaObjectId,
          type: attachment.media.type,
          displayUrl:
            attachment.media.type === "photo" ? attachment.media.url : undefined,
          playbackUrl:
            attachment.media.type === "video" ? attachment.media.url : undefined,
          thumbnailUrl:
            attachment.media.type === "photo" ? attachment.media.url : undefined,
          width: attachment.media.width,
          height: attachment.media.height,
          caption: item.body || item.title,
          alt: item.title?.trim() || "Memory",
        },
      })),
  );

  return [...locationPosts, ...memoryMedia].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}

function toDiveMemories(
  items: DiveMemoriesPageMemoryItem[],
  diveSiteId: string,
): DiveMemory[] {
  return items.map((item) => ({
    id: item.id,
    authorUserId: item.author.userId,
    diveSiteId,
    title: item.title,
    body: item.body,
    mediaIds: item.attachments.map((attachment) => attachment.mediaObjectId),
    visibility: item.visibility,
    occurredAt: item.occurredAt,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }));
}

function formatShortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

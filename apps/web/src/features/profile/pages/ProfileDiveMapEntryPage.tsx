"use client";

import type { DiveMemory } from "@freediving.ph/types";
import Image from "next/image";
import Link from "next/link";
import {
  ChevronLeft,
  HeartHandshake,
  ImageIcon,
  MessageSquare,
} from "lucide-react";

import { ProfileDiveMemories } from "@/features/profile/components/ProfileDiveMemories";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useProfileDiveMemoriesPageQuery } from "@/features/profile/hooks/queries";
import { normalizeUsername } from "@/lib/routes";

type ProfileDiveMapEntryPageProps = {
  username: string;
  entrySlug: string;
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
    return <EntryStatusCard title="Loading Dive Memories page" />;
  }

  if (pageQuery.isError || !pageQuery.data) {
    return <EntryStatusCard title="Dive Memories page unavailable" />;
  }

  const { entry, memoryItems, profile, proofItems, site } = pageQuery.data;
  const isOwner = profile.viewerIsOwner;
  const memories: DiveMemory[] = memoryItems.map((item) => ({
    id: item.id,
    authorUserId: item.author.userId,
    diveSiteId: site.diveSiteId,
    title: item.title,
    body: item.body,
    mediaIds: item.attachments.map((attachment) => attachment.mediaObjectId),
    visibility: item.visibility,
    occurredAt: item.occurredAt,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }));

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            size="sm"
            variant="outline"
            render={<Link href={`/${normalizedUsername}?tab=dive-memories`} />}
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Dive Memories
          </Button>
          <Badge variant="outline">{entry.proofCount} posts</Badge>
        </div>

        <section className="rounded-2xl border border-border/70 bg-background/90 p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <HeartHandshake className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-[0.18em]">
                  Dive Memories
                </span>
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-foreground">
                  {site.name}
                </h1>
                <p className="text-sm text-muted-foreground">{site.area}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">
                Last updated {formatShortDate(entry.lastUpdatedAt)}
              </Badge>
              <Badge variant="outline">
                First proof {formatShortDate(entry.firstProofAt)}
              </Badge>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border/70 bg-background/90 p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold text-base">Proof Posts</h2>
          </div>

          {proofItems.length === 0 ? (
            <EntryStatusCard
              title="No visible proof posts for this Dive Memories page"
              compact
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {proofItems.map((item) => {
                const isImage = item.media.mimeType.startsWith("image/");
                return (
                  <article
                    key={item.id}
                    className="overflow-hidden rounded-xl border border-border/70 bg-muted/10"
                  >
                    <div className="relative aspect-[4/3] bg-muted/30">
                      {isImage ? (
                        <Image
                          src={item.media.url}
                          alt={item.caption || `${site.name} proof post`}
                          fill
                          sizes="(max-width: 768px) 100vw, 33vw"
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-muted-foreground">
                          <ImageIcon className="h-6 w-6" />
                        </div>
                      )}
                    </div>
                    <div className="space-y-1 p-3">
                      <p className="line-clamp-2 text-sm font-medium text-foreground">
                        {item.caption || "Dive Memories proof post"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatShortDate(item.createdAt)}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border/70 bg-background/90 p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold text-base">
              {isOwner ? "Dive Memories" : "Visible Dive Memories"}
            </h2>
          </div>
          <ProfileDiveMemories
            username={normalizedUsername}
            isOwner={isOwner}
            filterDiveSiteId={site.diveSiteId}
            heading={
              isOwner ? "Add a memory for this dive site" : "Dive Memories"
            }
            items={memories}
          />
        </section>
      </div>
    </div>
  );
}

function EntryStatusCard({
  title,
  compact = false,
}: {
  title: string;
  compact?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-xl border border-dashed border-border/70 bg-background/55 px-4 py-4 text-sm text-muted-foreground",
        compact ? "" : "mx-auto max-w-5xl",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {title}
    </div>
  );
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

"use client";

import type { ProfileMediaItem } from "@freediving.ph/types";
import Image from "next/image";
import Link from "next/link";

type ProfileDiveSpotHighlight = {
  id: string;
  coverUrl?: string | null;
  diveSiteArea?: string;
  diveSiteId: string;
  diveSpotName: string;
  diveSpotSlug?: string;
  mediaCount: number;
  latestMediaCreatedAt: string;
};

type ProfileDiveSpotHighlightsProps = {
  items: ProfileMediaItem[];
};

const formatSpotCount = (count: number) =>
  count === 1 ? "1 post" : `${count} posts`;

const formatMeta = (item: ProfileDiveSpotHighlight) =>
  [item.diveSiteArea, formatSpotCount(item.mediaCount)].filter(Boolean).join(" · ");

const normalizeProfileDiveSpotHighlights = (items: ProfileMediaItem[]) => {
  const map = new Map<string, ProfileDiveSpotHighlight>();

  for (const item of items) {
    const diveSiteId = item.diveSite?.id;
    if (!diveSiteId || !item.diveSite.name) continue;

    const current = map.get(diveSiteId);
    const coverUrl = item.thumbnailUrl || item.previewUrl || null;
    const mediaCreatedAt = item.createdAt || "";

    if (!current) {
      map.set(diveSiteId, {
        id: item.diveSite.id,
        coverUrl,
        diveSiteArea: item.diveSite.area || undefined,
        diveSiteId,
        diveSpotName: item.diveSite.name,
        diveSpotSlug: item.diveSite.slug,
        mediaCount: 1,
        latestMediaCreatedAt: mediaCreatedAt,
      });
      continue;
    }

    current.mediaCount += 1;
    if (mediaCreatedAt > current.latestMediaCreatedAt) {
      current.latestMediaCreatedAt = mediaCreatedAt;
      if (coverUrl) current.coverUrl = coverUrl;
      current.diveSiteArea = item.diveSite.area || current.diveSiteArea;
      current.diveSpotName = item.diveSite.name || current.diveSpotName;
      current.diveSpotSlug = item.diveSite.slug || current.diveSpotSlug;
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    if (!a.latestMediaCreatedAt && !b.latestMediaCreatedAt) return 0;
    if (!a.latestMediaCreatedAt) return 1;
    if (!b.latestMediaCreatedAt) return -1;
    return b.latestMediaCreatedAt.localeCompare(a.latestMediaCreatedAt);
  });
};

function HighlightItem({ item }: { item: ProfileDiveSpotHighlight }) {
  const content = (
    <>
      <div className="relative size-20 overflow-hidden rounded-full border border-border/70 bg-secondary">
        {item.coverUrl ? (
          <Image
            src={item.coverUrl}
            alt={item.diveSpotName}
            fill
            sizes="80px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-muted-foreground">
            {item.diveSpotName[0]?.toUpperCase() ?? "?"}
          </div>
        )}
      </div>
      <div className="space-y-0.5 text-center">
        <p className="line-clamp-1 text-xs font-medium text-foreground">
          {item.diveSpotName}
        </p>
        <p className="line-clamp-2 text-[11px] text-muted-foreground">
          {formatMeta(item)}
        </p>
      </div>
    </>
  );

  if (!item.diveSpotSlug) {
    return (
      <div className="flex w-24 shrink-0 flex-col items-center gap-2">
        {content}
      </div>
    );
  }

  return (
    <Link
      href={`/explore/sites/${item.diveSpotSlug}`}
      className="flex w-24 shrink-0 flex-col items-center gap-2 rounded-xl px-1 py-1 transition hover:bg-muted/40"
    >
      {content}
    </Link>
  );
}

export function ProfileDiveSpotHighlights({
  items,
}: ProfileDiveSpotHighlightsProps) {
  const highlights = normalizeProfileDiveSpotHighlights(items);

  if (highlights.length === 0) return null;

  return (
    <div className="overflow-x-auto px-1 py-2">
      <div className="flex min-w-full gap-3">
        {highlights.map((item) => (
          <HighlightItem key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

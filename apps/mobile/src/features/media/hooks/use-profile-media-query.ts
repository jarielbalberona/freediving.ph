import { useInfiniteQuery } from "@tanstack/react-query";

import type { ListProfileMediaResponse } from "@freediving.ph/types";
import type { ProfileMediaItem } from "@freediving.ph/types";

import { getProfileMedia } from "@/features/media/api/media-api";
import { mobileQueryKeys } from "@/lib/query";
import { safeProfileUsername } from "@/features/profiles/lib/profile-format";

const PROFILE_MEDIA_PAGE_LIMIT = 24;

export const useProfileMediaQuery = (
  username: string | undefined,
  options: { enabled?: boolean; limit?: number } = {},
) => {
  const safeUsername = safeProfileUsername(username);
  const limit = options.limit ?? PROFILE_MEDIA_PAGE_LIMIT;

  return useInfiniteQuery<ListProfileMediaResponse>({
    enabled: Boolean(safeUsername) && (options.enabled ?? true),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      getProfileMedia(safeUsername ?? "", {
        cursor: pageParam as string | undefined,
        limit,
      }),
    queryKey: mobileQueryKeys.media.profileMedia(safeUsername ?? "", limit),
    staleTime: 2 * 60 * 1000,
  });
};

export type ProfileDiveSpotHighlight = {
  id: string;
  coverUrl?: string | null;
  diveSiteArea?: string;
  diveSiteId: string;
  diveSpotName: string;
  diveSpotSlug?: string;
  mediaCount: number;
  latestMediaCreatedAt: string;
};

export const normalizeProfileDiveSpotHighlights = (
  items: ProfileMediaItem[] | undefined,
) => {
  const map = new Map<string, ProfileDiveSpotHighlight>();

  for (const item of items ?? []) {
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

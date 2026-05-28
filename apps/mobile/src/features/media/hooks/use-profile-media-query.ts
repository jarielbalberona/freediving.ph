import { useInfiniteQuery } from "@tanstack/react-query";

import type { ListProfileMediaResponse } from "@freediving.ph/types";

import { getProfileMediaByUsername } from "@/features/media/api/media-api";
import { mobileQueryKeys } from "@/lib/query";
import { safeProfileUsername } from "@/features/profiles/lib/profile-format";

const PROFILE_MEDIA_PAGE_LIMIT = 24;

export const useProfileMediaByUsernameQuery = (
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
      getProfileMediaByUsername(safeUsername ?? "", {
        cursor: pageParam as string | undefined,
        limit,
      }),
    queryKey: mobileQueryKeys.media.profileMedia(safeUsername ?? "", limit),
    staleTime: 2 * 60 * 1000,
  });
};

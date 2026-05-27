import { useQuery } from "@tanstack/react-query";

import { getMediaPostComments } from "@/features/media/api/media-api";
import { mobileQueryKeys } from "@/lib/query/query-keys";

const MEDIA_POST_COMMENT_LIMIT = 30;

export const useMediaPostCommentsQuery = (
  postId: string | undefined,
  options: { enabled?: boolean } = {},
) =>
  useQuery({
    enabled: Boolean(postId) && (options.enabled ?? true),
    queryFn: () =>
      getMediaPostComments(postId ?? "", { limit: MEDIA_POST_COMMENT_LIMIT }),
    queryKey: mobileQueryKeys.media.postComments(postId ?? "", {
      limit: MEDIA_POST_COMMENT_LIMIT,
    }),
    staleTime: 60 * 1000,
  });

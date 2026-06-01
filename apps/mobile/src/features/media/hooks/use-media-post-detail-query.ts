import { useQuery } from "@tanstack/react-query";

import { getMediaPostDetail } from "@/features/media/api/media-api";
import { mobileQueryKeys } from "@/lib/query";

export const useMediaPostDetailQuery = (postId: string | undefined) =>
  useQuery({
    enabled: Boolean(postId),
    queryFn: () => getMediaPostDetail(postId ?? ""),
    queryKey: mobileQueryKeys.media.postDetail(postId ?? ""),
    staleTime: 60 * 1000,
  });

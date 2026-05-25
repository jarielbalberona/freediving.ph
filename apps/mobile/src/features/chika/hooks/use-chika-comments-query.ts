import { useQuery } from "@tanstack/react-query";

import { getChikaComments } from "@/features/chika/api/chika-api";
import { mobileQueryKeys } from "@/lib/query/query-keys";

const CHIKA_COMMENT_LIMIT = 20;

export const useChikaCommentsQuery = (threadId: string | undefined) =>
  useQuery({
    enabled: Boolean(threadId),
    queryFn: () => getChikaComments(threadId ?? "", { limit: CHIKA_COMMENT_LIMIT }),
    queryKey: mobileQueryKeys.chika.threadComments(threadId ?? "", {
      limit: CHIKA_COMMENT_LIMIT,
    }),
    staleTime: 2 * 60 * 1000,
  });

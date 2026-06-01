import { useQuery } from "@tanstack/react-query";

import { getChikaThreads } from "@/features/chika/api/chika-api";
import { mobileQueryKeys } from "@/lib/query/query-keys";

const CHIKA_THREAD_LIMIT = 20;

export const useChikaThreadsQuery = (category?: string) =>
  useQuery({
    queryFn: () => getChikaThreads({ category, limit: CHIKA_THREAD_LIMIT }),
    queryKey: mobileQueryKeys.chika.threadList({
      category,
      limit: CHIKA_THREAD_LIMIT,
    }),
    staleTime: 5 * 60 * 1000,
  });

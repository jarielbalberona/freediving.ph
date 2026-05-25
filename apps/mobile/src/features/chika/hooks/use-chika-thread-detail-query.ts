import { useQuery } from "@tanstack/react-query";

import { getChikaThreadDetail } from "@/features/chika/api/chika-api";
import { mobileQueryKeys } from "@/lib/query/query-keys";

export const useChikaThreadDetailQuery = (slug: string | undefined) =>
  useQuery({
    enabled: Boolean(slug),
    queryFn: () => getChikaThreadDetail(slug ?? ""),
    queryKey: mobileQueryKeys.chika.threadDetail(slug ?? ""),
    staleTime: 5 * 60 * 1000,
  });

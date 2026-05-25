import { useQuery } from "@tanstack/react-query";

import { getEventDetail } from "@/features/events/api/events-api";
import { mobileQueryKeys } from "@/lib/query";

export function useEventDetailQuery(slug: string | undefined) {
  return useQuery({
    enabled: Boolean(slug),
    queryFn: () => getEventDetail(slug ?? ""),
    queryKey: mobileQueryKeys.events.detail(slug ?? ""),
    staleTime: 5 * 60 * 1000,
  });
}

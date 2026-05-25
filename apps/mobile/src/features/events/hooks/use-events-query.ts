import { useQuery } from "@tanstack/react-query";

import { getEvents } from "@/features/events/api/events-api";
import { mobileQueryKeys } from "@/lib/query";

const EVENT_LIST_LIMIT = 24;

export function useEventsQuery() {
  const filters = {
    limit: EVENT_LIST_LIMIT,
    page: 1,
    status: "published" as const,
  };

  return useQuery({
    queryFn: () => getEvents(filters),
    queryKey: mobileQueryKeys.events.list(filters),
    staleTime: 5 * 60 * 1000,
  });
}

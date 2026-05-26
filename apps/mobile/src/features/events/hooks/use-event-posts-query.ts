import { useQuery } from "@tanstack/react-query";

import { getEventPosts } from "@/features/events/api/events-api";
import { mobileQueryKeys } from "@/lib/query";

export const useEventPostsQuery = (eventId: string | undefined, enabled: boolean) =>
  useQuery({
    enabled: enabled && Boolean(eventId),
    queryFn: () => getEventPosts(eventId ?? ""),
    queryKey: mobileQueryKeys.events.posts(eventId ?? ""),
    staleTime: 60 * 1000,
  });

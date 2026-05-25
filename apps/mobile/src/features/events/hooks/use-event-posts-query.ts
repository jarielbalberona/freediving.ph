import { getEventPosts } from "@/features/events/api/events-api";
import { useAuthenticatedFphgoQuery } from "@/lib/query";
import { mobileQueryKeys } from "@/lib/query";

export const useEventPostsQuery = (eventId: string | undefined, enabled: boolean) =>
  useAuthenticatedFphgoQuery({
    enabled: enabled && Boolean(eventId),
    queryFn: (_context, authToken) => getEventPosts(eventId ?? "", authToken),
    queryKey: [...mobileQueryKeys.events.detail(eventId ?? ""), "posts"] as const,
    staleTime: 60 * 1000,
  });

import { getBuddyFinderIntents } from "@/features/buddies/api/buddies-api";
import { mobileQueryKeys, useAuthenticatedFphgoQuery } from "@/lib/query";

const BUDDY_INTENT_LIMIT = 20;

export function useBuddyFinderQuery() {
  const filters = { limit: BUDDY_INTENT_LIMIT };

  return useAuthenticatedFphgoQuery({
    queryFn: (_context, authToken) => getBuddyFinderIntents(filters, authToken),
    queryKey: mobileQueryKeys.buddies.intents(filters),
    staleTime: 2 * 60 * 1000,
  });
}

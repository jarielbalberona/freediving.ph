import { useQuery } from "@tanstack/react-query";

import {
  getBuddyFinderIntents,
  getBuddyFinderPreview,
  getMyBuddyFinderIntents,
} from "@/features/buddies/api/buddies-api";
import { mobileQueryKeys, useAuthenticatedFphgoQuery } from "@/lib/query";

const BUDDY_INTENT_LIMIT = 20;

export function useBuddyFinderQuery() {
  const filters = { limit: BUDDY_INTENT_LIMIT };

  return useQuery({
    queryFn: () => getBuddyFinderPreview(filters),
    queryKey: mobileQueryKeys.buddies.preview(filters),
    staleTime: 2 * 60 * 1000,
  });
}

export function useMyBuddyFinderIntentsQuery() {
  return useAuthenticatedFphgoQuery({
    queryFn: (_context, authToken) => getMyBuddyFinderIntents(authToken),
    queryKey: mobileQueryKeys.buddies.mine(),
    staleTime: 60 * 1000,
  });
}

export function useMemberBuddyFinderIntentsQuery() {
  const filters = { limit: BUDDY_INTENT_LIMIT };

  return useAuthenticatedFphgoQuery({
    queryFn: (_context, authToken) => getBuddyFinderIntents(filters, authToken),
    queryKey: mobileQueryKeys.buddies.intents(filters),
    staleTime: 60 * 1000,
  });
}

import { useQuery } from "@tanstack/react-query";

import { getBuddyFinderPreview } from "@/features/buddies/api/buddies-api";
import { mobileQueryKeys } from "@/lib/query";

const BUDDY_INTENT_LIMIT = 20;

export function useBuddyFinderQuery() {
  const filters = { limit: BUDDY_INTENT_LIMIT };

  return useQuery({
    queryFn: () => getBuddyFinderPreview(filters),
    queryKey: mobileQueryKeys.buddies.preview(filters),
    staleTime: 2 * 60 * 1000,
  });
}

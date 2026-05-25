import { getMyExploreSiteSubmissions } from "@/features/explore/api/explore-api";
import { useAuthenticatedFphgoQuery } from "@/lib/query";
import { mobileQueryKeys } from "@/lib/query";

export const useMyExploreSubmissionsQuery = () =>
  useAuthenticatedFphgoQuery({
    queryFn: (_context, authToken) => getMyExploreSiteSubmissions(authToken),
    queryKey: [...mobileQueryKeys.explore.all, "submissions", "mine"] as const,
    staleTime: 60 * 1000,
  });

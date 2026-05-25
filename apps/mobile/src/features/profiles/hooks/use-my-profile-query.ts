import { getMyProfile } from "@/features/profiles/api/profiles-api";
import { mobileQueryKeys, useAuthenticatedFphgoQuery } from "@/lib/query";

export function useMyProfileQuery() {
  return useAuthenticatedFphgoQuery({
    queryFn: (_context, authToken) => getMyProfile(authToken),
    queryKey: mobileQueryKeys.profile.me(),
    staleTime: 60 * 1000,
  });
}

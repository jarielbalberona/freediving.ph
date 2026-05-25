import { getPublicProfileByUsername } from "@/features/profiles/api/profiles-api";
import { safeProfileUsername } from "@/features/profiles/lib/profile-format";
import { mobileQueryKeys, useAuthenticatedFphgoQuery } from "@/lib/query";

export function usePublicProfileQuery(username: string | undefined) {
  const safeUsername = safeProfileUsername(username);

  return useAuthenticatedFphgoQuery({
    enabled: Boolean(safeUsername),
    queryFn: (_context, authToken) =>
      getPublicProfileByUsername(safeUsername ?? "", authToken),
    queryKey: mobileQueryKeys.profile.public(safeUsername ?? ""),
    staleTime: 5 * 60 * 1000,
  });
}

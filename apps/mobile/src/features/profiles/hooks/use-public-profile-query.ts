import { getPublicProfileByUsername } from "@/features/profiles/api/profiles-api";
import { safeProfileUsername } from "@/features/profiles/lib/profile-format";
import { useQuery } from "@tanstack/react-query";

import { mobileQueryKeys } from "@/lib/query";

export function usePublicProfileQuery(username: string | undefined) {
  const safeUsername = safeProfileUsername(username);

  return useQuery({
    enabled: Boolean(safeUsername),
    queryFn: () => getPublicProfileByUsername(safeUsername ?? ""),
    queryKey: mobileQueryKeys.profile.public(safeUsername ?? ""),
    staleTime: 5 * 60 * 1000,
  });
}

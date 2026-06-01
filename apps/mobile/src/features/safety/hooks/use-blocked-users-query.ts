import { useAuth } from "@clerk/expo";

import { listBlockedUsers } from "@/features/safety/api/safety-api";
import { mobileQueryKeys, useAuthenticatedFphgoQuery } from "@/lib/query";

export const useBlockedUsersQuery = () => {
  const { isLoaded, isSignedIn } = useAuth();

  return useAuthenticatedFphgoQuery({
    enabled: isLoaded && Boolean(isSignedIn),
    queryFn: async (_context, authToken) => listBlockedUsers(authToken),
    queryKey: mobileQueryKeys.safety.blocks(),
    staleTime: 30 * 1000,
  });
};

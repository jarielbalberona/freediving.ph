import { useAuth } from "@clerk/expo";

import { getGroupMembers, getGroupPosts } from "@/features/groups/api/groups-api";
import { FphgoApiError } from "@/lib/api";
import { useAuthenticatedFphgoQuery } from "@/lib/query";
import { mobileQueryKeys } from "@/lib/query";

const missingTokenError = () => new FphgoApiError(401, "Sign in to continue.", null);

export const useGroupMembersQuery = (groupId: string | undefined, enabled: boolean) =>
  useAuthenticatedFphgoQuery({
    enabled: enabled && Boolean(groupId),
    queryFn: async (_context, authToken) => {
      if (!groupId) throw missingTokenError();
      return getGroupMembers(groupId, authToken);
    },
    queryKey: mobileQueryKeys.groups.members(groupId ?? ""),
    staleTime: 2 * 60 * 1000,
  });

export const useGroupPostsQuery = (groupId: string | undefined, enabled: boolean) =>
  useAuthenticatedFphgoQuery({
    enabled: enabled && Boolean(groupId),
    queryFn: async (_context, authToken) => {
      if (!groupId) throw missingTokenError();
      return getGroupPosts(groupId, authToken);
    },
    queryKey: mobileQueryKeys.groups.posts(groupId ?? ""),
    staleTime: 60 * 1000,
  });

export const useIsSignedIn = () => {
  const { isLoaded, isSignedIn } = useAuth();
  return isLoaded && Boolean(isSignedIn);
};

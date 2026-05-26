import { useAuth } from "@clerk/expo";
import { useQuery } from "@tanstack/react-query";

import { getGroupMembers, getGroupPosts } from "@/features/groups/api/groups-api";
import { mobileQueryKeys } from "@/lib/query";

export const useGroupMembersQuery = (groupId: string | undefined, enabled: boolean) =>
  useQuery({
    enabled: enabled && Boolean(groupId),
    queryFn: () => getGroupMembers(groupId ?? ""),
    queryKey: mobileQueryKeys.groups.members(groupId ?? ""),
    staleTime: 2 * 60 * 1000,
  });

export const useGroupPostsQuery = (groupId: string | undefined, enabled: boolean) =>
  useQuery({
    enabled: enabled && Boolean(groupId),
    queryFn: () => getGroupPosts(groupId ?? ""),
    queryKey: mobileQueryKeys.groups.posts(groupId ?? ""),
    staleTime: 60 * 1000,
  });

export const useIsSignedIn = () => {
  const { isLoaded, isSignedIn } = useAuth();
  return isLoaded && Boolean(isSignedIn);
};

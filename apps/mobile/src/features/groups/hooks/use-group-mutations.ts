import { useAuth } from "@clerk/expo";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  createGroupPost,
  joinGroup,
  leaveGroup,
} from "@/features/groups/api/groups-api";
import { FphgoApiError } from "@/lib/api";
import { mobileQueryKeys } from "@/lib/query";

const useRequiredToken = () => {
  const { getToken } = useAuth();
  return async () => {
    const token = await getToken();
    if (!token) throw new FphgoApiError(401, "Sign in to continue.", null);
    return token;
  };
};

export const useJoinGroupMutation = (slug: string, groupId: string) => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async () => joinGroup(groupId, await getRequiredToken()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.groups.detail(slug) });
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.groups.list({ limit: 30 }) });
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.groups.members(groupId) });
    },
  });
};

export const useLeaveGroupMutation = (slug: string, groupId: string) => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async () => leaveGroup(groupId, await getRequiredToken()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.groups.detail(slug) });
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.groups.list({ limit: 30 }) });
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.groups.members(groupId) });
    },
  });
};

export const useCreateGroupPostMutation = (slug: string, groupId: string) => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async (payload: { content: string; title?: string }) =>
      createGroupPost({ groupId, ...payload }, await getRequiredToken()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.groups.detail(slug) });
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.groups.posts(groupId) });
    },
  });
};

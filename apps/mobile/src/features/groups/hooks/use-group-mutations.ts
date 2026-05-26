import { useAuth } from "@clerk/expo";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { GroupPostsResponse } from "@freediving.ph/types";

import {
  acceptGroupInvite,
  createGroupPost,
  joinGroup,
  leaveGroup,
  rejectGroupInvite,
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

const requireGroupId = (groupId: string) => {
  if (!groupId) {
    throw new FphgoApiError(400, "Group unavailable.", null);
  }
  return groupId;
};

const invalidateGroupMembership = (
  queryClient: ReturnType<typeof useQueryClient>,
  slug: string,
  groupId: string,
) => {
  if (slug) {
    queryClient.invalidateQueries({ queryKey: mobileQueryKeys.groups.detail(slug) });
  }
  queryClient.invalidateQueries({ queryKey: mobileQueryKeys.groups.lists() });
  if (groupId) {
    queryClient.invalidateQueries({ queryKey: mobileQueryKeys.groups.members(groupId) });
  }
};

export const useJoinGroupMutation = (slug: string, groupId: string) => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async () =>
      joinGroup(requireGroupId(groupId), await getRequiredToken()),
    onSuccess: () => {
      invalidateGroupMembership(queryClient, slug, groupId);
    },
  });
};

export const useLeaveGroupMutation = (slug: string, groupId: string) => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async () =>
      leaveGroup(requireGroupId(groupId), await getRequiredToken()),
    onSuccess: () => {
      invalidateGroupMembership(queryClient, slug, groupId);
    },
  });
};

export const useAcceptGroupInviteMutation = (slug: string, groupId: string) => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async () =>
      acceptGroupInvite(requireGroupId(groupId), await getRequiredToken()),
    onSuccess: () => {
      invalidateGroupMembership(queryClient, slug, groupId);
    },
  });
};

export const useRejectGroupInviteMutation = (slug: string, groupId: string) => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async () =>
      rejectGroupInvite(requireGroupId(groupId), await getRequiredToken()),
    onSuccess: () => {
      invalidateGroupMembership(queryClient, slug, groupId);
    },
  });
};

export const useCreateGroupPostMutation = (slug: string, groupId: string) => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async (payload: { content: string; title?: string }) =>
      createGroupPost({ groupId: requireGroupId(groupId), ...payload }, await getRequiredToken()),
    onSuccess: (response) => {
      queryClient.setQueryData<GroupPostsResponse>(
        mobileQueryKeys.groups.posts(groupId),
        (current) =>
          current
            ? {
                ...current,
                pagination: {
                  ...current.pagination,
                  total: current.pagination.total + 1,
                },
                posts: [response.post, ...current.posts],
              }
            : current,
      );
      if (slug) {
        queryClient.invalidateQueries({ queryKey: mobileQueryKeys.groups.detail(slug) });
      }
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.groups.posts(groupId) });
    },
  });
};

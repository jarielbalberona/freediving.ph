import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/expo";
import type {
  CreateGroupRequest,
  CreateGroupPostRequest,
  GroupListResponse,
  GroupPostsResponse,
} from "@freediving.ph/types";

import {
  acceptGroupInvite,
  createGroup,
  createGroupPost,
  joinGroup,
  leaveGroup,
  rejectGroupInvite,
} from "@/features/groups/api/groups-api";
import { FphgoApiError } from "@/lib/api";
import { mobileQueryKeys } from "@/lib/query";

const useRequiredToken = () => {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  return async () => {
    if (!isLoaded) {
      throw new FphgoApiError(
        401,
        "Checking your session. Try again in a moment.",
        null,
      );
    }
    if (!isSignedIn) {
      throw new FphgoApiError(401, "Sign in to continue.", null);
    }
    const token = await getToken();
    if (!token) throw new FphgoApiError(401, "Sign in to continue.", null);
    return token;
  };
};

const requireGroupId = (groupId: string) => {
  const trimmedGroupId = groupId.trim();
  if (!trimmedGroupId) {
    throw new FphgoApiError(400, "Group unavailable.", null);
  }
  return trimmedGroupId;
};

const requireGroupPostPayload = (
  groupId: string,
  payload: { content: string; title?: string },
): CreateGroupPostRequest => {
  const content = payload.content.trim();
  if (!content) {
    throw new FphgoApiError(400, "Write something before posting.", null);
  }
  return {
    content,
    groupId: requireGroupId(groupId),
    title: payload.title?.trim() || undefined,
  };
};

const requireCreateGroupPayload = (
  payload: CreateGroupRequest,
): CreateGroupRequest => {
  const name = payload.name.trim();
  if (name.length < 3) {
    throw new FphgoApiError(400, "Group name must be at least 3 characters.", null);
  }
  return {
    ...payload,
    bio: payload.bio?.trim() || undefined,
    description: payload.description?.trim() || undefined,
    formattedAddress: payload.formattedAddress?.trim() || undefined,
    joinPolicy: payload.joinPolicy ?? "open",
    location: payload.location?.trim() || undefined,
    locationName: payload.locationName?.trim() || undefined,
    locationSource: payload.locationSource ?? "manual",
    name,
    slug: payload.slug?.trim() || undefined,
    visibility: payload.visibility ?? "public",
  };
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
      createGroupPost(
        requireGroupPostPayload(groupId, payload),
        await getRequiredToken(),
      ),
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
                posts: [
                  response.post,
                  ...current.posts.filter((post) => post.id !== response.post.id),
                ],
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

export const useCreateGroupMutation = () => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async (payload: CreateGroupRequest) =>
      createGroup(requireCreateGroupPayload(payload), await getRequiredToken()),
    onSuccess: (response) => {
      queryClient.setQueriesData<GroupListResponse>(
        { queryKey: mobileQueryKeys.groups.lists() },
        (current) =>
          current
            ? {
                ...current,
                groups: [
                  response.group,
                  ...current.groups.filter(
                    (group) => group.id !== response.group.id,
                  ),
                ],
                pagination: {
                  ...current.pagination,
                  total: current.pagination.total + 1,
                },
              }
            : current,
      );
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.groups.lists() });
    },
  });
};

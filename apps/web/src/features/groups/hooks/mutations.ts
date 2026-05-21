import { useMutation, useQueryClient } from "@tanstack/react-query";
import { groupsApi } from "../api/groups";
import { queryKeys } from "@/lib/query/query-keys";
import type {
  CreateGroupRequest,
  UpdateGroupRequest,
  JoinGroupRequest,
  InviteGroupMemberRequest,
  CreateGroupPostRequest,
} from "@freediving.ph/types";

export const useCreateGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateGroupRequest) => groupsApi.createGroup(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
    },
  });
};

export const useUpdateGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      groupId,
      data,
    }: {
      groupId: string;
      data: UpdateGroupRequest;
    }) => groupsApi.updateGroup(groupId, data),
    onSuccess: (_response, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.groups.detail(variables.groupId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
    },
  });
};

export const useJoinGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: JoinGroupRequest) => groupsApi.joinGroup(data),
    onSuccess: (_response, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.groups.detail(variables.groupId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.groups.members(variables.groupId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
    },
  });
};

export const useLeaveGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId }: { groupId: string }) =>
      groupsApi.leaveGroup(groupId),
    onSuccess: (_response, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.groups.detail(variables.groupId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.groups.members(variables.groupId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
    },
  });
};

export const useInviteGroupMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: InviteGroupMemberRequest) =>
      groupsApi.inviteMember(data),
    onSuccess: (_response, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.groups.detail(variables.groupId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.groups.members(variables.groupId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
    },
  });
};

export const useAcceptGroupInvite = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId }: { groupId: string }) =>
      groupsApi.acceptInvite(groupId),
    onSuccess: (_response, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.groups.detail(variables.groupId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.groups.members(variables.groupId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
    },
  });
};

export const useRejectGroupInvite = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId }: { groupId: string }) =>
      groupsApi.rejectInvite(groupId),
    onSuccess: (_response, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.groups.detail(variables.groupId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
    },
  });
};

export const useCreateGroupPost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateGroupPostRequest) =>
      groupsApi.createGroupPost(data),
    onSuccess: (_response, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.groups.posts(variables.groupId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.groups.detail(variables.groupId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.lists() });
    },
  });
};

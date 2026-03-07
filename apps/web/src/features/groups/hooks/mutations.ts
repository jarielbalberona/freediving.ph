import { useMutation, useQueryClient } from '@tanstack/react-query';
import { groupsApi } from '../api/groups';
import type {
  CreateGroupRequest,
  UpdateGroupRequest,
  JoinGroupRequest,
  CreateGroupPostRequest,
} from '@freediving.ph/types';

export const useCreateGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateGroupRequest) => groupsApi.createGroup(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['user-groups'] });
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
      queryClient.invalidateQueries({ queryKey: ['group', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['user-groups'] });
    },
  });
};

export const useJoinGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: JoinGroupRequest) => groupsApi.joinGroup(data),
    onSuccess: (_response, variables) => {
      queryClient.invalidateQueries({ queryKey: ['group', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['group-members', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['user-groups'] });
    },
  });
};

export const useLeaveGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId }: { groupId: string }) => groupsApi.leaveGroup(groupId),
    onSuccess: (_response, variables) => {
      queryClient.invalidateQueries({ queryKey: ['group', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['group-members', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['user-groups'] });
    },
  });
};

export const useCreateGroupPost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateGroupPostRequest) => groupsApi.createGroupPost(data),
    onSuccess: (_response, variables) => {
      queryClient.invalidateQueries({ queryKey: ['group-posts', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['group', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
};

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { groupsApi } from '../api/groups';
import type {
  CreateGroupRequest,
  UpdateGroupRequest,
  JoinGroupRequest,
  CreateGroupPostRequest
} from '../types';

export const useCreateGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateGroupRequest & { userId: number }) =>
      groupsApi.createGroup(data),
    onSuccess: (response, variables) => {
      // Invalidate groups list
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      // Invalidate user groups
      queryClient.invalidateQueries({
        queryKey: ['user-groups', variables.userId]
      });
    },
  });
};

export const useUpdateGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      groupId,
      data
    }: {
      groupId: number;
      data: UpdateGroupRequest & { userId: number }
    }) =>
      groupsApi.updateGroup(groupId, data),
    onSuccess: (response, variables) => {
      // Invalidate specific group
      queryClient.invalidateQueries({
        queryKey: ['group', variables.groupId]
      });
      // Invalidate groups list
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      // Invalidate user groups
      queryClient.invalidateQueries({
        queryKey: ['user-groups', variables.data.userId]
      });
    },
  });
};

export const useJoinGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: JoinGroupRequest) =>
      groupsApi.joinGroup(data),
    onSuccess: (response, variables) => {
      // Invalidate specific group
      queryClient.invalidateQueries({
        queryKey: ['group', variables.groupId]
      });
      // Invalidate group members
      queryClient.invalidateQueries({
        queryKey: ['group-members', variables.groupId]
      });
      // Invalidate user groups
      queryClient.invalidateQueries({
        queryKey: ['user-groups', variables.userId]
      });
    },
  });
};

export const useLeaveGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, userId }: { groupId: number; userId: number }) =>
      groupsApi.leaveGroup(groupId, userId),
    onSuccess: (response, variables) => {
      // Invalidate specific group
      queryClient.invalidateQueries({
        queryKey: ['group', variables.groupId]
      });
      // Invalidate group members
      queryClient.invalidateQueries({
        queryKey: ['group-members', variables.groupId]
      });
      // Invalidate user groups
      queryClient.invalidateQueries({
        queryKey: ['user-groups', variables.userId]
      });
    },
  });
};

export const useCreateGroupPost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateGroupPostRequest) =>
      groupsApi.createGroupPost(data),
    onSuccess: (response, variables) => {
      // Invalidate group posts
      queryClient.invalidateQueries({
        queryKey: ['group-posts', variables.groupId]
      });
      // Invalidate specific group (for post count)
      queryClient.invalidateQueries({
        queryKey: ['group', variables.groupId]
      });
    },
  });
};

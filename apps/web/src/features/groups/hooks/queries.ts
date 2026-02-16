import { useQuery } from '@tanstack/react-query';
import { groupsApi } from '../api/groups';
import type { GroupFilters } from '@freediving.ph/types';

export const useGroups = (filters?: GroupFilters) => {
  return useQuery({
    queryKey: ['groups', filters],
    queryFn: () => groupsApi.getGroups(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
  });
};

export const useGroup = (groupId: number) => {
  return useQuery({
    queryKey: ['group', groupId],
    queryFn: () => groupsApi.getGroupById(groupId),
    enabled: !!groupId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useGroupMembers = (groupId: number, page?: number, limit?: number) => {
  return useQuery({
    queryKey: ['group-members', groupId, page, limit],
    queryFn: () => groupsApi.getGroupMembers(groupId, page, limit),
    enabled: !!groupId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useGroupPosts = (groupId: number, page?: number, limit?: number) => {
  return useQuery({
    queryKey: ['group-posts', groupId, page, limit],
    queryFn: () => groupsApi.getGroupPosts(groupId, page, limit),
    enabled: !!groupId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

export const useUserGroups = (userId: number, page?: number, limit?: number) => {
  return useQuery({
    queryKey: ['user-groups', userId, page, limit],
    queryFn: () => groupsApi.getUserGroups(userId, page, limit),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
};

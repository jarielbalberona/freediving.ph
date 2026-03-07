import { useQuery } from '@tanstack/react-query';
import { groupsApi } from '../api/groups';
import type { GroupFilters } from '@freediving.ph/types';

export const useGroups = (filters?: GroupFilters) => {
  return useQuery({
    queryKey: ['groups', filters],
    queryFn: () => groupsApi.getGroups(filters),
    staleTime: 5 * 60 * 1000,
    retry: 3,
  });
};

export const useGroup = (groupId: string) => {
  return useQuery({
    queryKey: ['group', groupId],
    queryFn: () => groupsApi.getGroupById(groupId),
    enabled: !!groupId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useGroupMembers = (groupId: string, page?: number, limit?: number) => {
  return useQuery({
    queryKey: ['group-members', groupId, page, limit],
    queryFn: () => groupsApi.getGroupMembers(groupId, page, limit),
    enabled: !!groupId,
    staleTime: 2 * 60 * 1000,
  });
};

export const useGroupPosts = (groupId: string, page?: number, limit?: number) => {
  return useQuery({
    queryKey: ['group-posts', groupId, page, limit],
    queryFn: () => groupsApi.getGroupPosts(groupId, page, limit),
    enabled: !!groupId,
    staleTime: 60 * 1000,
  });
};

export const useUserGroups = (page?: number, limit?: number) => {
  return useQuery({
    queryKey: ['user-groups', page, limit],
    queryFn: () => groupsApi.getGroups({ mine: true, page, limit }),
    staleTime: 5 * 60 * 1000,
  });
};

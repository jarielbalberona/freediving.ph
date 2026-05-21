import { useQuery } from "@tanstack/react-query";
import type { GroupFilters } from "@freediving.ph/types";

import { queryKeys } from "@/lib/query/query-keys";

import { groupsApi } from "../api/groups";

export const useGroups = (filters?: GroupFilters, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.groups.list(
      filters as Record<string, unknown> | undefined,
    ),
    queryFn: () => groupsApi.getGroups(filters),
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: 3,
  });
};

export const useGroup = (groupId: string) => {
  return useQuery({
    queryKey: queryKeys.groups.detail(groupId),
    queryFn: () => groupsApi.getGroupById(groupId),
    enabled: !!groupId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useGroupMembers = (
  groupId: string,
  page?: number,
  limit?: number,
) => {
  return useQuery({
    queryKey: queryKeys.groups.members(groupId, page, limit),
    queryFn: () => groupsApi.getGroupMembers(groupId, page, limit),
    enabled: !!groupId,
    staleTime: 2 * 60 * 1000,
  });
};

export const useGroupPosts = (
  groupId: string,
  page?: number,
  limit?: number,
) => {
  return useQuery({
    queryKey: queryKeys.groups.posts(groupId, page, limit),
    queryFn: () => groupsApi.getGroupPosts(groupId, page, limit),
    enabled: !!groupId,
    staleTime: 60 * 1000,
  });
};

export const useUserGroups = (
  page?: number,
  limit?: number,
  enabled = true,
) => {
  return useQuery({
    queryKey: queryKeys.groups.userGroups(page, limit),
    queryFn: () => groupsApi.getGroups({ mine: true, page, limit }),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
};

import type { GroupFilters } from "@freediving.ph/types";
import { useQuery } from "@tanstack/react-query";

import { getApiErrorStatus } from "@/lib/http/api-error";
import { queryKeys } from "@/lib/query/query-keys";

import { groupsApi } from "../api/groups";

export const useGroups = (
  filters?: GroupFilters,
  enabled = true,
  viewerScope = "public",
) => {
  return useQuery({
    queryKey: queryKeys.groups.list({
      ...(filters as Record<string, unknown> | undefined),
      viewerScope,
    }),
    queryFn: () => groupsApi.getGroups(filters),
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: 3,
  });
};

export const useGroup = (
  slug: string,
  viewerScope = "public",
  enabled = true,
) => {
  return useQuery({
    queryKey: [...queryKeys.groups.detail(slug), viewerScope],
    queryFn: () => groupsApi.getGroupBySlug(slug),
    enabled: !!slug && enabled,
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error) => {
      const status = getApiErrorStatus(error);
      if (status === 401 || status === 403 || status === 404) return false;
      return failureCount < 3;
    },
  });
};

export const useGroupMembers = (
  groupId: string,
  page?: number,
  limit?: number,
  enabled = true,
  viewerScope = "public",
) => {
  return useQuery({
    queryKey: [...queryKeys.groups.members(groupId, page, limit), viewerScope],
    queryFn: () => groupsApi.getGroupMembers(groupId, page, limit),
    enabled: !!groupId && enabled,
    staleTime: 2 * 60 * 1000,
  });
};

export const useGroupPosts = (
  groupId: string,
  page?: number,
  limit?: number,
  enabled = true,
  viewerScope = "public",
) => {
  return useQuery({
    queryKey: [...queryKeys.groups.posts(groupId, page, limit), viewerScope],
    queryFn: () => groupsApi.getGroupPosts(groupId, page, limit),
    enabled: !!groupId && enabled,
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

import { useQuery } from "@tanstack/react-query";
import type { GroupFilters } from "@freediving.ph/types";

import { getGroupDetail, getGroups } from "@/features/groups/api/groups-api";
import { mobileQueryKeys } from "@/lib/query";

export const useGroupsQuery = (filters: GroupFilters = {}) => {
  const params = {
    limit: filters.limit ?? 30,
    mine: filters.mine || undefined,
    search: filters.search?.trim() || undefined,
    visibility: filters.visibility,
  };

  return useQuery({
    queryFn: () => getGroups(params),
    queryKey: mobileQueryKeys.groups.list(params),
    staleTime: 2 * 60 * 1000,
  });
};

export const useGroupListQuery = (filters: GroupFilters = {}) =>
  useQuery({
    queryFn: () => getGroups({ limit: filters.limit ?? 30, ...filters }),
    queryKey: mobileQueryKeys.groups.list({
      limit: filters.limit ?? 30,
      mine: filters.mine || undefined,
      search: filters.search?.trim() || undefined,
      visibility: filters.visibility,
    }),
    staleTime: 2 * 60 * 1000,
  });

export const useGroupDetailQuery = (slug: string | undefined) =>
  useQuery({
    enabled: Boolean(slug),
    queryFn: () => getGroupDetail(slug ?? ""),
    queryKey: mobileQueryKeys.groups.detail(slug ?? ""),
    staleTime: 2 * 60 * 1000,
  });

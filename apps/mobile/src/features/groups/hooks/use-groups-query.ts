import { useQuery } from "@tanstack/react-query";

import { getGroupDetail, getGroups } from "@/features/groups/api/groups-api";
import { mobileQueryKeys } from "@/lib/query";

export const useGroupsQuery = () =>
  useQuery({
    queryFn: () => getGroups({ limit: 30 }),
    queryKey: mobileQueryKeys.groups.list({ limit: 30 }),
    staleTime: 2 * 60 * 1000,
  });

export const useGroupDetailQuery = (slug: string | undefined) =>
  useQuery({
    enabled: Boolean(slug),
    queryFn: () => getGroupDetail(slug ?? ""),
    queryKey: mobileQueryKeys.groups.detail(slug ?? ""),
    staleTime: 2 * 60 * 1000,
  });

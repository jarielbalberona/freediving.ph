import type { AdminListParams } from "@freediving.ph/types";
import { useQuery } from "@tanstack/react-query";

import { adminApi } from "@/features/admin/api/admin";

export const adminQueryKeys = {
  profiles: (params: AdminListParams) => ["admin", "profiles", params] as const,
  diveSites: (params: AdminListParams) =>
    ["admin", "dive-sites", params] as const,
  groups: (params: AdminListParams) => ["admin", "groups", params] as const,
};

export function useAdminProfiles(params: AdminListParams) {
  return useQuery({
    queryKey: adminQueryKeys.profiles(params),
    queryFn: () => adminApi.listProfiles(params),
    staleTime: 30 * 1000,
  });
}

export function useAdminDiveSites(params: AdminListParams) {
  return useQuery({
    queryKey: adminQueryKeys.diveSites(params),
    queryFn: () => adminApi.listDiveSites(params),
    staleTime: 30 * 1000,
  });
}

export function useAdminGroups(params: AdminListParams) {
  return useQuery({
    queryKey: adminQueryKeys.groups(params),
    queryFn: () => adminApi.listGroups(params),
    staleTime: 30 * 1000,
  });
}

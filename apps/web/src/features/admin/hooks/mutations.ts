import type { AdminUpdateGroupRequest } from "@freediving.ph/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { adminApi } from "@/features/admin/api/admin";
import { adminQueryKeys } from "@/features/admin/hooks/queries";
import { queryKeys } from "@/lib/query/query-keys";

export function useAdminUpdateGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      groupId,
      data,
    }: {
      groupId: string;
      data: AdminUpdateGroupRequest;
    }) => adminApi.updateGroup(groupId, data),
    onSuccess: (_response, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "groups"] });
      queryClient.invalidateQueries({
        queryKey: queryKeys.groups.detail(variables.groupId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
    },
  });
}

export function useAdminArchiveGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId }: { groupId: string }) =>
      adminApi.archiveGroup(groupId),
    onSuccess: (_response, variables) => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.groups({}) });
      queryClient.invalidateQueries({ queryKey: ["admin", "groups"] });
      queryClient.invalidateQueries({
        queryKey: queryKeys.groups.detail(variables.groupId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
    },
  });
}

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { userApi } from "../api/user";
import type { UpdateUserRequest } from "@freediving.ph/types";
import { queryKeys } from "@/lib/query/query-keys";

export const useUpdateCurrentUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateUserRequest) => userApi.updateCurrentUser(data),
    onSuccess: (response, variables) => {
      // Invalidate current user
      queryClient.invalidateQueries({
        queryKey: queryKeys.users.current(),
      });
      // Invalidate users list if admin
      queryClient.invalidateQueries({
        queryKey: queryKeys.users.lists(),
      });
    },
  });
};

export const useDeleteCurrentUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => userApi.deleteCurrentUser(),
    onSuccess: (response, variables) => {
      // Remove current user from cache
      queryClient.removeQueries({
        queryKey: queryKeys.users.current(),
      });
      // Invalidate users list
      queryClient.invalidateQueries({
        queryKey: queryKeys.users.lists(),
      });
    },
  });
};

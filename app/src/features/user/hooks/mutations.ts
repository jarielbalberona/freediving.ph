import { useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi } from '../api/user';
import type { UpdateUserRequest } from '../types';

export const useUpdateCurrentUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateUserRequest) =>
      userApi.updateCurrentUser(data),
    onSuccess: (response, variables) => {
      // Invalidate current user
      queryClient.invalidateQueries({
        queryKey: ['current-user']
      });
      // Invalidate users list if admin
      queryClient.invalidateQueries({
        queryKey: ['users']
      });
    },
  });
};

export const useDeleteCurrentUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      userApi.deleteCurrentUser(),
    onSuccess: (response, variables) => {
      // Remove current user from cache
      queryClient.removeQueries({
        queryKey: ['current-user']
      });
      // Invalidate users list
      queryClient.invalidateQueries({
        queryKey: ['users']
      });
    },
  });
};

import { useQuery } from '@tanstack/react-query';
import { userApi } from '../api/user';
import type { UserFilters } from '../types';

export const useUsers = (filters?: UserFilters) => {
  return useQuery({
    queryKey: ['users', filters],
    queryFn: () => userApi.getUsers(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

export const useCurrentUser = () => {
  return useQuery({
    queryKey: ['current-user'],
    queryFn: () => userApi.getCurrentUser(),
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 3,
  });
};

export const useUser = (userId: number) => {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: () => userApi.getUserById(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
};

import { useQuery } from "@tanstack/react-query";
import { userApi } from "../api/user";
import type { UserFilters } from "@freediving.ph/types";
import { queryKeys } from "@/lib/query/query-keys";

export const useUsers = (filters?: UserFilters) => {
  return useQuery({
    queryKey: queryKeys.users.list(
      filters as Record<string, unknown> | undefined,
    ),
    queryFn: () => userApi.getUsers(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

export const useCurrentUser = () => {
  return useQuery({
    queryKey: queryKeys.users.current(),
    queryFn: () => userApi.getCurrentUser(),
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 3,
  });
};

export const useUser = (userId: number) => {
  return useQuery({
    queryKey: queryKeys.users.detail(userId),
    queryFn: () => userApi.getUserById(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
};

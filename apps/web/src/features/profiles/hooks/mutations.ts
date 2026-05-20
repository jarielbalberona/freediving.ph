import { useMutation, useQueryClient } from "@tanstack/react-query";

import { SESSION_QUERY_KEY } from "@/features/auth/session";
import { queryKeys } from "@/lib/query/query-keys";

import { profilesApi } from "../api/profiles";
import type { UpdateMyProfileRequest } from "@freediving.ph/types";

export const useUpdateMyProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateMyProfileRequest) => profilesApi.updateMyProfile(payload),
    onSuccess: (response) => {
      const profile = response.profile;
      queryClient.setQueryData(queryKeys.profile.me(), response);
      queryClient.setQueryData(SESSION_QUERY_KEY, (current: any) => {
        if (!current) return current;
        return {
          ...current,
          displayName: profile.displayName ?? current.displayName,
          username: profile.username ?? current.username,
        };
      });
      if (profile.username) {
        queryClient.setQueryData(queryKeys.profile.public(profile.username), (current: any) => {
          if (!current) return current;
          return {
            ...current,
            displayName: profile.displayName,
            bio: profile.bio,
            avatarUrl: profile.avatarUrl,
          };
        });
      }
    },
  });
};

export const useSaveUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => profilesApi.saveUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.saved() });
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.me() });
    },
  });
};

export const useUnsaveUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => profilesApi.unsaveUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.saved() });
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.me() });
    },
  });
};

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/query-keys";

import { profilesApi } from "../api/profiles";
import { updateProfileInCaches } from "../lib/cache-updaters";
import type { UpdateMyProfileRequest } from "@freediving.ph/types";

export const useUpdateMyProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateMyProfileRequest) =>
      profilesApi.updateMyProfile(payload),
    onSuccess: (response) => {
      updateProfileInCaches(queryClient, response);
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

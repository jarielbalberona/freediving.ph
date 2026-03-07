import { useMutation, useQueryClient } from "@tanstack/react-query";

import { profilesApi } from "../api/profiles";
import type { UpdateMyProfileRequest } from "@freediving.ph/types";

export const useUpdateMyProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateMyProfileRequest) => profilesApi.updateMyProfile(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles", "me"] });
    },
  });
};

export const useSaveUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => profilesApi.saveUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles", "saved"] });
      queryClient.invalidateQueries({ queryKey: ["profiles", "me"] });
    },
  });
};

export const useUnsaveUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => profilesApi.unsaveUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles", "saved"] });
      queryClient.invalidateQueries({ queryKey: ["profiles", "me"] });
    },
  });
};

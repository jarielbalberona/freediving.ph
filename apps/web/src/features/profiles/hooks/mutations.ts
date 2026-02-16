import { useMutation, useQueryClient } from "@tanstack/react-query";

import { profilesApi } from "../api/profiles";
import type { CreatePersonalBestRequest, UpdateOwnProfileRequest } from '@freediving.ph/types';

export const useUpdateOwnProfile = (username?: string | null) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateOwnProfileRequest) => profilesApi.updateOwnProfile(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles", username] });
    },
  });
};

export const useCreatePersonalBest = (username?: string | null) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreatePersonalBestRequest) => profilesApi.createPersonalBest(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles", username] });
    },
  });
};

export const useDeletePersonalBest = (username?: string | null) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => profilesApi.deletePersonalBest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles", username] });
    },
  });
};

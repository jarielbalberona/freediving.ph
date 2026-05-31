"use client";

import type { UpdatePassportSettingsRequest } from "@freediving.ph/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { profileApi } from "@/features/profile/api/profileApi";
import { queryKeys } from "@/lib/query/query-keys";
import { normalizeUsername } from "@/lib/routes";

export const useUpdatePassportSettings = (username: string) => {
  const queryClient = useQueryClient();
  const normalizedUsername = normalizeUsername(username);

  return useMutation({
    mutationFn: (payload: UpdatePassportSettingsRequest) =>
      profileApi.updateMyPassportSettings(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.profile.passport(normalizedUsername),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.profile.myPassportSettings(),
      });
    },
  });
};

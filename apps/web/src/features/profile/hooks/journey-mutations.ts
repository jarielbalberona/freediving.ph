"use client";

import type { CreateManualJourneyEntryRequest } from "@freediving.ph/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { profileApi } from "@/features/profile/api/profileApi";
import { queryKeys } from "@/lib/query/query-keys";
import { normalizeUsername } from "@/lib/routes";

export const useCreateJourneyEntry = (username: string) => {
  const queryClient = useQueryClient();
  const normalizedUsername = normalizeUsername(username);

  return useMutation({
    mutationFn: (payload: CreateManualJourneyEntryRequest) =>
      profileApi.createJourneyEntry(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.profile.journey(normalizedUsername),
      });
    },
  });
};

export const useDeleteJourneyEntry = (username: string) => {
  const queryClient = useQueryClient();
  const normalizedUsername = normalizeUsername(username);

  return useMutation({
    mutationFn: (entryId: string) => profileApi.deleteJourneyEntry(entryId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.profile.journey(normalizedUsername),
      });
    },
  });
};

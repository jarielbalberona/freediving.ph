import { useMutation, useQueryClient } from "@tanstack/react-query";

import { trackProductEvent } from "@/lib/analytics/product-events";
import { queryKeys } from "@/lib/query/query-keys";

import { profilesApi } from "../api/profiles";
import { updateProfileInCaches } from "../lib/cache-updaters";
import type { UpdateMyProfileRequest } from "@freediving.ph/types";
import type { UpsertUserBadgeRequest } from "@freediving.ph/types";

export const useUpdateMyProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateMyProfileRequest) =>
      profilesApi.updateMyProfile(payload),
    onSuccess: (response) => {
      if (
        response.profile.displayName?.trim() &&
        (response.profile.bio?.trim() || response.profile.avatarUrl)
      ) {
        trackProductEvent("profile_completed");
      }
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

export const useCreateBadge = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpsertUserBadgeRequest) =>
      profilesApi.createBadge(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.myBadges() });
    },
  });
};

export const useUpdateBadge = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      badgeId,
      payload,
    }: {
      badgeId: string;
      payload: UpsertUserBadgeRequest;
    }) => profilesApi.updateBadge(badgeId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.myBadges() });
    },
  });
};

export const useDeleteBadge = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (badgeId: string) => profilesApi.deleteBadge(badgeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.myBadges() });
    },
  });
};

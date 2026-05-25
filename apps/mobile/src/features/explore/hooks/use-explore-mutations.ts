import { useAuth } from "@clerk/expo";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { CreateExploreSiteSubmissionRequest } from "@freediving.ph/types";

import {
  likeExploreSite,
  saveExploreSite,
  submitExploreSite,
  unlikeExploreSite,
  unsaveExploreSite,
} from "@/features/explore/api/explore-api";
import { FphgoApiError } from "@/lib/api";
import { mobileQueryKeys } from "@/lib/query";

const useRequiredToken = () => {
  const { getToken } = useAuth();
  return async () => {
    const token = await getToken();
    if (!token) throw new FphgoApiError(401, "Sign in to continue.", null);
    return token;
  };
};

export const useSubmitExploreSiteMutation = () => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async (payload: CreateExploreSiteSubmissionRequest) =>
      submitExploreSite(payload, await getRequiredToken()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.explore.all });
    },
  });
};

export const useExploreSiteLikeMutation = () => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async (payload: { siteId: string; viewerHasLiked: boolean }) => {
      const token = await getRequiredToken();
      return payload.viewerHasLiked
        ? unlikeExploreSite(payload.siteId, token)
        : likeExploreSite(payload.siteId, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.explore.all });
    },
  });
};

export const useExploreSiteSaveMutation = () => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async (payload: { siteId: string; isSaved: boolean }) => {
      const token = await getRequiredToken();
      return payload.isSaved
        ? unsaveExploreSite(payload.siteId, token)
        : saveExploreSite(payload.siteId, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.explore.all });
    },
  });
};

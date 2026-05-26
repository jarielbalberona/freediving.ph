import { useAuth } from "@clerk/expo";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type {
  CreateExploreSiteSubmissionRequest,
  ExploreListResponse,
  ExploreSiteDetailResponse,
} from "@freediving.ph/types";

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

const requireSiteId = (siteId: string) => {
  if (!siteId) throw new FphgoApiError(400, "Dive spot unavailable.", null);
  return siteId;
};

const patchExploreSite = (
  queryClient: ReturnType<typeof useQueryClient>,
  siteId: string,
  patch: { isSaved?: boolean; likeCount?: number; viewerHasLiked?: boolean },
) => {
  queryClient.setQueriesData<ExploreListResponse>(
    { queryKey: mobileQueryKeys.explore.sites() },
    (current) => {
      if (!current?.items) return current;
      return {
        ...current,
        items: current.items.map((site) =>
          site.id === siteId ? { ...site, ...patch } : site,
        ),
      };
    },
  );
  queryClient.setQueriesData<ExploreSiteDetailResponse>(
    { queryKey: mobileQueryKeys.explore.siteDetails() },
    (current) => {
      if (!current?.site || current.site.id !== siteId) return current;
      return {
        ...current,
        site: { ...current.site, ...patch },
      };
    },
  );
};

export const useSubmitExploreSiteMutation = () => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async (payload: CreateExploreSiteSubmissionRequest) =>
      submitExploreSite(payload, await getRequiredToken()),
    onSuccess: (response) => {
      queryClient.setQueryData(
        mobileQueryKeys.explore.mySubmissions(),
        (current: { items?: unknown[]; nextCursor?: string } | undefined) => ({
          items: current?.items
            ? [response.submission, ...current.items]
            : [response.submission],
          nextCursor: current?.nextCursor,
        }),
      );
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.explore.mySubmissions() });
      if (response.submission.moderationState === "approved") {
        queryClient.invalidateQueries({ queryKey: mobileQueryKeys.explore.sites() });
      }
    },
  });
};

export const useExploreSiteLikeMutation = () => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async (payload: { siteId: string; viewerHasLiked: boolean }) => {
      const token = await getRequiredToken();
      const siteId = requireSiteId(payload.siteId);
      return payload.viewerHasLiked
        ? unlikeExploreSite(siteId, token)
        : likeExploreSite(siteId, token);
    },
    onSuccess: (response) => {
      patchExploreSite(queryClient, response.targetId, {
        likeCount: response.likeCount,
        viewerHasLiked: response.viewerHasLiked,
      });
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.explore.sites() });
    },
  });
};

export const useExploreSiteSaveMutation = () => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async (payload: { siteId: string; isSaved: boolean }) => {
      const token = await getRequiredToken();
      const siteId = requireSiteId(payload.siteId);
      return payload.isSaved
        ? unsaveExploreSite(siteId, token).then(() => ({
            isSaved: false,
            siteId,
          }))
        : saveExploreSite(siteId, token).then((response) => ({
            isSaved: response.saved,
            siteId,
          }));
    },
    onSuccess: (response) => {
      patchExploreSite(queryClient, response.siteId, { isSaved: response.isSaved });
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.explore.sites() });
    },
  });
};

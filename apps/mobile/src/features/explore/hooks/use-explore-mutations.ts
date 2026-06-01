import { useAuth } from "@clerk/expo";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type {
  CreateDivePresenceRequest,
  CreateDiveSiteAffinityRequest,
  CreateDiveSiteReviewRequest,
  CreateExploreSiteEditProposalRequest,
  CreateExploreSiteUpdateRequest,
  CreateExploreSiteSubmissionRequest,
  DivePresenceListResponse,
  DiveSiteAffinityListResponse,
  DiveSiteReviewListResponse,
  ExploreSiteEditProposalListResponse,
  ExploreListResponse,
  ExploreSiteDetailResponse,
  ExploreSiteSubmissionListResponse,
} from "@freediving.ph/types";

import {
  createExploreSiteAffinity,
  createExploreSiteEditProposal,
  createExploreSitePresence,
  createExploreSiteReview,
  createExploreSiteUpdate,
  likeExploreSite,
  saveExploreSite,
  submitExploreSite,
  unlikeExploreSite,
  unsaveExploreSite,
} from "@/features/explore/api/explore-api";
import { FphgoApiError } from "@/lib/api";
import { mobileQueryKeys } from "@/lib/query";

const useRequiredToken = () => {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  return async () => {
    if (!isLoaded) {
      throw new FphgoApiError(
        401,
        "Checking your session. Try again in a moment.",
        null,
      );
    }
    if (!isSignedIn) {
      throw new FphgoApiError(401, "Sign in to continue.", null);
    }
    const token = await getToken();
    if (!token) throw new FphgoApiError(401, "Sign in to continue.", null);
    return token;
  };
};

const requireSiteId = (siteId: string) => {
  const trimmedSiteId = siteId.trim();
  if (!trimmedSiteId) {
    throw new FphgoApiError(400, "Dive spot unavailable.", null);
  }
  return trimmedSiteId;
};

const requireSiteSubmissionPayload = (
  payload: CreateExploreSiteSubmissionRequest,
): CreateExploreSiteSubmissionRequest => {
  const name = payload.name.trim();
  const description = payload.description.trim();
  if (name.length < 3) {
    throw new FphgoApiError(400, "Site name must be at least 3 characters.", null);
  }
  if (description.length < 12) {
    throw new FphgoApiError(
      400,
      "Description must be at least 12 characters.",
      null,
    );
  }
  if (
    !Number.isFinite(payload.lat) ||
    payload.lat < -90 ||
    payload.lat > 90 ||
    !Number.isFinite(payload.lng) ||
    payload.lng < -180 ||
    payload.lng > 180
  ) {
    throw new FphgoApiError(400, "Enter valid dive spot coordinates.", null);
  }
  return {
    ...payload,
    access: payload.access?.trim() || undefined,
    area: payload.area?.trim() || undefined,
    bestSeason: payload.bestSeason?.trim() || undefined,
    description,
    fees: payload.fees?.trim() || undefined,
    hazards: payload.hazards?.map((item) => item.trim()).filter(Boolean),
    name,
    typicalConditions: payload.typicalConditions?.trim() || undefined,
  };
};

const requireSiteSlug = (slug: string) => {
  const trimmedSlug = slug.trim();
  if (!trimmedSlug) {
    throw new FphgoApiError(400, "Dive spot unavailable.", null);
  }
  return trimmedSlug;
};

const cleanOptionalText = (value: string | undefined) =>
  value?.trim() || undefined;

const requireSiteUpdatePayload = (
  payload: CreateExploreSiteUpdateRequest,
): CreateExploreSiteUpdateRequest => {
  const note = payload.note.trim();
  if (note.length < 3) {
    throw new FphgoApiError(400, "Condition note must be at least 3 characters.", null);
  }
  return {
    ...payload,
    note,
  };
};

const requireSiteEditPayload = (
  payload: CreateExploreSiteEditProposalRequest,
): CreateExploreSiteEditProposalRequest => {
  const name = payload.name.trim();
  const description = payload.description.trim();
  if (name.length < 3) {
    throw new FphgoApiError(400, "Site name must be at least 3 characters.", null);
  }
  if (description.length < 12) {
    throw new FphgoApiError(
      400,
      "Description must be at least 12 characters.",
      null,
    );
  }
  if (
    !Number.isFinite(payload.lat) ||
    payload.lat < -90 ||
    payload.lat > 90 ||
    !Number.isFinite(payload.lng) ||
    payload.lng < -180 ||
    payload.lng > 180
  ) {
    throw new FphgoApiError(400, "Enter valid dive spot coordinates.", null);
  }
  return {
    ...payload,
    access: cleanOptionalText(payload.access),
    bestSeason: cleanOptionalText(payload.bestSeason),
    description,
    fees: cleanOptionalText(payload.fees),
    hazards: payload.hazards?.map((item) => item.trim()).filter(Boolean),
    name,
    typicalConditions: cleanOptionalText(payload.typicalConditions),
  };
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
      submitExploreSite(
        requireSiteSubmissionPayload(payload),
        await getRequiredToken(),
      ),
    onSuccess: (response) => {
      queryClient.setQueryData<ExploreSiteSubmissionListResponse>(
        mobileQueryKeys.explore.mySubmissions(),
        (current) => ({
          items: current?.items
            ? [response.submission, ...current.items]
            : [response.submission],
          nextCursor: current?.nextCursor,
        }),
      );
      queryClient.invalidateQueries({
        queryKey: mobileQueryKeys.explore.mySubmissions(),
      });
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

export const useCreateExploreSiteUpdateMutation = () => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async (input: {
      payload: CreateExploreSiteUpdateRequest;
      siteId: string;
      slug: string;
    }) =>
      createExploreSiteUpdate(
        requireSiteId(input.siteId),
        requireSiteUpdatePayload(input.payload),
        await getRequiredToken(),
      ),
    onSuccess: (response, input) => {
      queryClient.setQueryData<ExploreSiteDetailResponse>(
        mobileQueryKeys.explore.siteDetail(input.slug),
        (current) => {
          if (!current) return current;
          return {
            ...current,
            updates: [response.update, ...current.updates],
          };
        },
      );
      queryClient.invalidateQueries({
        queryKey: mobileQueryKeys.explore.siteDetail(input.slug),
      });
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.explore.sites() });
    },
  });
};

export const useCreateExploreSiteEditProposalMutation = () => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async (input: {
      payload: CreateExploreSiteEditProposalRequest;
      slug: string;
    }) =>
      createExploreSiteEditProposal(
        requireSiteSlug(input.slug),
        requireSiteEditPayload(input.payload),
        await getRequiredToken(),
      ),
    onSuccess: (response) => {
      queryClient.setQueryData<ExploreSiteEditProposalListResponse>(
        mobileQueryKeys.explore.myEditProposals(),
        (current) => ({
          items: current?.items
            ? [response.proposal, ...current.items]
            : [response.proposal],
          nextCursor: current?.nextCursor,
        }),
      );
      queryClient.invalidateQueries({
        queryKey: mobileQueryKeys.explore.myEditProposals(),
      });
      if (response.appliedImmediately) {
        queryClient.invalidateQueries({
          queryKey: mobileQueryKeys.explore.siteDetail(response.proposal.siteSlug),
        });
        queryClient.invalidateQueries({ queryKey: mobileQueryKeys.explore.sites() });
      }
    },
  });
};

export const useCreateExploreSitePresenceMutation = () => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async (input: {
      payload: CreateDivePresenceRequest;
      slug: string;
    }) =>
      createExploreSitePresence(
        requireSiteSlug(input.slug),
        {
          ...input.payload,
          note: cleanOptionalText(input.payload.note),
        },
        await getRequiredToken(),
      ),
    onSuccess: (response, input) => {
      queryClient.setQueryData<DivePresenceListResponse>(
        mobileQueryKeys.explore.presence(input.slug),
        (current) => ({
          items: [
            response.presence,
            ...(current?.items ?? []).filter(
              (item) => item.id !== response.presence.id,
            ),
          ],
        }),
      );
      queryClient.invalidateQueries({
        queryKey: mobileQueryKeys.explore.related(input.slug),
      });
    },
  });
};

export const useCreateExploreSiteAffinityMutation = () => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async (input: {
      payload: CreateDiveSiteAffinityRequest;
      slug: string;
    }) =>
      createExploreSiteAffinity(
        requireSiteSlug(input.slug),
        {
          ...input.payload,
          note: cleanOptionalText(input.payload.note),
        },
        await getRequiredToken(),
      ),
    onSuccess: (response, input) => {
      queryClient.setQueryData<DiveSiteAffinityListResponse>(
        mobileQueryKeys.explore.affinities(input.slug),
        (current) => ({
          items: [
            response.affinity,
            ...(current?.items ?? []).filter(
              (item) => item.id !== response.affinity.id,
            ),
          ],
        }),
      );
      queryClient.invalidateQueries({
        queryKey: mobileQueryKeys.explore.related(input.slug),
      });
    },
  });
};

export const useCreateExploreSiteReviewMutation = () => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async (input: {
      payload: CreateDiveSiteReviewRequest;
      slug: string;
    }) =>
      createExploreSiteReview(
        requireSiteSlug(input.slug),
        {
          ...input.payload,
          comment: cleanOptionalText(input.payload.comment),
        },
        await getRequiredToken(),
      ),
    onSuccess: (response, input) => {
      queryClient.setQueryData<DiveSiteReviewListResponse>(
        mobileQueryKeys.explore.reviews(input.slug),
        (current) => {
          const items = current?.items ?? [];
          const nextItems = [
            response.review,
            ...items.filter((item) => item.userId !== response.review.userId),
          ];
          const nextReviewCount = Math.max(
            current?.reviewCount ?? 0,
            nextItems.length,
          );
          const averageRating =
            nextItems.reduce((sum, item) => sum + item.rating, 0) /
            nextItems.length;
          return {
            averageRating: Number.isFinite(averageRating)
              ? averageRating
              : (current?.averageRating ?? response.review.rating),
            items: nextItems,
            reviewCount: nextReviewCount,
          };
        },
      );
      queryClient.invalidateQueries({
        queryKey: mobileQueryKeys.explore.related(input.slug),
      });
    },
  });
};

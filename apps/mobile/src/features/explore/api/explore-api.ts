import type {
  CreateDivePresenceRequest,
  CreateDiveSiteAffinityRequest,
  CreateDiveSiteReviewRequest,
  CreateExploreSiteEditProposalRequest,
  CreateExploreSiteUpdateRequest,
  CreateExploreSiteSubmissionRequest,
  DivePresenceListResponse,
  DivePresenceResponse,
  DiveSiteAffinityListResponse,
  DiveSiteAffinityResponse,
  DiveSiteReviewListResponse,
  DiveSiteReviewResponse,
  ExploreListResponse,
  ExploreSiteCommunityPostsResponse,
  ExploreSiteEditProposalListResponse,
  ExploreSiteEditProposalResponse,
  ExploreSiteLikeResponse,
  ExploreSiteRelatedResponse,
  ExploreSiteSaveResponse,
  ExploreSiteDetailResponse,
  ExploreSiteSubmissionListResponse,
  ExploreSiteSubmissionResponse,
} from "@freediving.ph/types";

import { fphgoFetch } from "@/lib/api";

const withQuery = (
  path: string,
  params: Record<string, string | number | boolean | undefined>,
) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `${path}?${query}` : path;
};

export type ExploreSiteListParams = {
  area?: string;
  difficulty?: "easy" | "moderate" | "hard";
  limit?: number;
  savedOnly?: boolean;
  search?: string;
  verifiedOnly?: boolean;
};

export const getExploreSites = (params: ExploreSiteListParams = {}) =>
  fphgoFetch<ExploreListResponse>(
    withQuery("/v1/explore/sites", {
      area: params.area,
      difficulty: params.difficulty,
      limit: params.limit,
      savedOnly: params.savedOnly,
      search: params.search,
      verifiedOnly: params.verifiedOnly,
    }),
    { auth: "optional" },
  );

export const getExploreSiteDetail = (slug: string) =>
  fphgoFetch<ExploreSiteDetailResponse>(
    withQuery(`/v1/explore/sites/${encodeURIComponent(slug)}`, {
      updatesLimit: 5,
    }),
    { auth: "optional" },
  );

export const getExploreSiteRelated = (slug: string) =>
  fphgoFetch<ExploreSiteRelatedResponse>(
    `/v1/explore/sites/${encodeURIComponent(slug)}/related`,
    { auth: "optional" },
  );

export const getExploreSitePresence = (slug: string) =>
  fphgoFetch<DivePresenceListResponse>(
    withQuery(`/v1/explore/sites/${encodeURIComponent(slug)}/presence`, {
      limit: 20,
    }),
    { auth: "optional" },
  );

export const getExploreSiteAffinities = (slug: string) =>
  fphgoFetch<DiveSiteAffinityListResponse>(
    withQuery(`/v1/explore/sites/${encodeURIComponent(slug)}/affinities`, {
      limit: 20,
    }),
    { auth: "optional" },
  );

export const getExploreSiteReviews = (slug: string) =>
  fphgoFetch<DiveSiteReviewListResponse>(
    withQuery(`/v1/explore/sites/${encodeURIComponent(slug)}/reviews`, {
      limit: 20,
    }),
    { auth: "optional" },
  );

export const getExploreSiteCommunityPosts = (slug: string) =>
  fphgoFetch<ExploreSiteCommunityPostsResponse>(
    withQuery(`/v1/explore/sites/${encodeURIComponent(slug)}/community-posts`, {
      limit: 10,
    }),
    { auth: "optional" },
  );

export const submitExploreSite = (
  payload: CreateExploreSiteSubmissionRequest,
  authToken: string,
) =>
  fphgoFetch<ExploreSiteSubmissionResponse>("/v1/explore/sites/submit", {
    auth: "required",
    authToken,
    body: payload,
    method: "POST",
  });

export const getMyExploreSiteSubmissions = (authToken: string) =>
  fphgoFetch<ExploreSiteSubmissionListResponse>("/v1/explore/sites/submissions", {
    auth: "required",
    authToken,
  });

export const getMyExploreSiteEditProposals = (authToken: string) =>
  fphgoFetch<ExploreSiteEditProposalListResponse>(
    "/v1/explore/sites/edit-proposals",
    {
      auth: "required",
      authToken,
    },
  );

export const likeExploreSite = (siteId: string, authToken: string) =>
  fphgoFetch<ExploreSiteLikeResponse>(`/v1/explore/sites/${encodeURIComponent(siteId)}/likes`, {
    auth: "required",
    authToken,
    method: "POST",
  });

export const unlikeExploreSite = (siteId: string, authToken: string) =>
  fphgoFetch<ExploreSiteLikeResponse>(`/v1/explore/sites/${encodeURIComponent(siteId)}/likes`, {
    auth: "required",
    authToken,
    method: "DELETE",
  });

export const saveExploreSite = (siteId: string, authToken: string) =>
  fphgoFetch<ExploreSiteSaveResponse>(`/v1/explore/sites/${encodeURIComponent(siteId)}/save`, {
    auth: "required",
    authToken,
    method: "POST",
  });

export const unsaveExploreSite = (siteId: string, authToken: string) =>
  fphgoFetch<void>(`/v1/explore/sites/${encodeURIComponent(siteId)}/save`, {
    auth: "required",
    authToken,
    method: "DELETE",
  });

export const createExploreSiteUpdate = (
  siteId: string,
  payload: CreateExploreSiteUpdateRequest,
  authToken: string,
) =>
  fphgoFetch<{ update: ExploreSiteDetailResponse["updates"][number] }>(
    `/v1/explore/sites/${encodeURIComponent(siteId)}/updates`,
    {
      auth: "required",
      authToken,
      body: payload,
      method: "POST",
    },
  );

export const createExploreSiteEditProposal = (
  slug: string,
  payload: CreateExploreSiteEditProposalRequest,
  authToken: string,
) =>
  fphgoFetch<ExploreSiteEditProposalResponse>(
    `/v1/explore/sites/${encodeURIComponent(slug)}/edit-proposals`,
    {
      auth: "required",
      authToken,
      body: payload,
      method: "POST",
    },
  );

export const createExploreSitePresence = (
  slug: string,
  payload: CreateDivePresenceRequest,
  authToken: string,
) =>
  fphgoFetch<DivePresenceResponse>(
    `/v1/explore/sites/${encodeURIComponent(slug)}/presence`,
    {
      auth: "required",
      authToken,
      body: payload,
      method: "POST",
    },
  );

export const createExploreSiteAffinity = (
  slug: string,
  payload: CreateDiveSiteAffinityRequest,
  authToken: string,
) =>
  fphgoFetch<DiveSiteAffinityResponse>(
    `/v1/explore/sites/${encodeURIComponent(slug)}/affinities`,
    {
      auth: "required",
      authToken,
      body: payload,
      method: "POST",
    },
  );

export const createExploreSiteReview = (
  slug: string,
  payload: CreateDiveSiteReviewRequest,
  authToken: string,
) =>
  fphgoFetch<DiveSiteReviewResponse>(
    `/v1/explore/sites/${encodeURIComponent(slug)}/reviews`,
    {
      auth: "required",
      authToken,
      body: payload,
      method: "POST",
    },
  );

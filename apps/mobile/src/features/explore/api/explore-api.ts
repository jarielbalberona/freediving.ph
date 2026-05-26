import type {
  CreateExploreSiteSubmissionRequest,
  ExploreListResponse,
  ExploreSiteLikeResponse,
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

export const getExploreSites = (params: { limit?: number } = {}) =>
  fphgoFetch<ExploreListResponse>(
    withQuery("/v1/explore/sites", {
      limit: params.limit,
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

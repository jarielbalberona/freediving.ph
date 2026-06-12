import type {
  CreateDiveMemoryRequest,
  CreateManualJourneyEntryRequest,
  DiveMemoryResponse,
  DiveMemoryTagsResponse,
  JourneyEntryResponse,
  PassportSettingsResponse,
  ProfileBadgesResponse,
  ProfileDiveMapResponse,
  ProfileDiveMemoriesPageResponse,
  ProfileDiveMemoriesResponse,
  ProfileDivingResponse,
  ProfileJourneyResponse,
  ProfilePassportResponse,
  ProfileViewResponse,
  ProfileResponse,
  SavedHubResponse,
  SearchUsersResponse,
  UpdateDiveMemoryRequest,
  UpdateDiveMemoryTagRequest,
  UpdateManualJourneyEntryRequest,
  UpdatePassportSettingsRequest,
  UpdateMyProfileRequest,
} from "@freediving.ph/types";

import { fphgoFetch } from "@/lib/api";

export const getMyProfile = (authToken: string) =>
  fphgoFetch<ProfileResponse>("/v1/me/profile", {
    auth: "required",
    authToken,
  });

export const getProfileViewByUsername = (
  username: string,
) =>
  fphgoFetch<ProfileViewResponse>(
    `/v1/profiles/${encodeURIComponent(username)}`,
    {
      auth: "none",
    },
  );

export const updateMyProfile = (
  payload: UpdateMyProfileRequest,
  authToken: string,
) =>
  fphgoFetch<ProfileResponse>("/v1/me/profile", {
    auth: "required",
    authToken,
    body: payload,
    method: "PATCH",
  });

export const getSavedHub = (authToken: string) =>
  fphgoFetch<SavedHubResponse>("/v1/me/saved", {
    auth: "required",
    authToken,
  });

export const searchUsers = (query: string, limit = 10) =>
  fphgoFetch<SearchUsersResponse>(
    `/v1/users/search?q=${encodeURIComponent(query.trim())}&limit=${limit}`,
    { auth: "optional" },
  );

export const getProfileDiving = (username: string) =>
  fphgoFetch<ProfileDivingResponse>(
    `/v1/profiles/${encodeURIComponent(username)}/diving`,
    { auth: "optional" },
  );

export const getProfileBadges = (username: string) =>
  fphgoFetch<ProfileBadgesResponse>(
    `/v1/profiles/${encodeURIComponent(username)}/badges`,
    { auth: "optional" },
  );

export const getProfileDiveMap = (username: string) =>
  fphgoFetch<ProfileDiveMapResponse>(
    `/v1/profiles/${encodeURIComponent(username)}/dive-map`,
    { auth: "optional" },
  );

export const getProfilePassport = (username: string) =>
  fphgoFetch<ProfilePassportResponse>(
    `/v1/profiles/${encodeURIComponent(username)}/passport`,
    { auth: "optional" },
  );

export const getProfileJourney = (username: string) =>
  fphgoFetch<ProfileJourneyResponse>(
    `/v1/profiles/${encodeURIComponent(username)}/journey`,
    { auth: "optional" },
  );

export const getProfileDiveMemories = (username: string) =>
  fphgoFetch<ProfileDiveMemoriesResponse>(
    `/v1/profiles/${encodeURIComponent(username)}/dive-memories`,
    { auth: "optional" },
  );

export const getProfileDiveMemoriesPage = (
  username: string,
  entrySlug: string,
) =>
  fphgoFetch<ProfileDiveMemoriesPageResponse>(
    `/v1/profiles/${encodeURIComponent(username)}/dive-memories/${encodeURIComponent(entrySlug)}`,
    { auth: "optional" },
  );

export const getMyDiveMemories = (authToken: string) =>
  fphgoFetch<ProfileDiveMemoriesResponse>("/v1/me/dive-memories", {
    auth: "required",
    authToken,
  });

export const createDiveMemory = (
  payload: CreateDiveMemoryRequest,
  authToken: string,
) =>
  fphgoFetch<DiveMemoryResponse>("/v1/me/dive-memories", {
    auth: "required",
    authToken,
    body: payload,
    method: "POST",
  });

export const updateDiveMemory = (
  memoryId: string,
  payload: UpdateDiveMemoryRequest,
  authToken: string,
) =>
  fphgoFetch<DiveMemoryResponse>(
    `/v1/me/dive-memories/${encodeURIComponent(memoryId)}`,
    {
      auth: "required",
      authToken,
      body: payload,
      method: "PATCH",
    },
  );

export const deleteDiveMemory = (memoryId: string, authToken: string) =>
  fphgoFetch<void>(`/v1/me/dive-memories/${encodeURIComponent(memoryId)}`, {
    auth: "required",
    authToken,
    method: "DELETE",
  });

export const getMyDiveMemoryTags = (authToken: string) =>
  fphgoFetch<DiveMemoryTagsResponse>("/v1/me/dive-memory-tags", {
    auth: "required",
    authToken,
  });

export const updateDiveMemoryTag = (
  memoryId: string,
  payload: UpdateDiveMemoryTagRequest,
  authToken: string,
) =>
  fphgoFetch<DiveMemoryTagsResponse>(
    `/v1/me/dive-memory-tags/${encodeURIComponent(memoryId)}`,
    {
      auth: "required",
      authToken,
      body: payload,
      method: "PATCH",
    },
  );

export const getMyPassportSettings = (authToken: string) =>
  fphgoFetch<PassportSettingsResponse>("/v1/me/passport-settings", {
    auth: "required",
    authToken,
  });

export const updateMyPassportSettings = (
  payload: UpdatePassportSettingsRequest,
  authToken: string,
) =>
  fphgoFetch<PassportSettingsResponse>("/v1/me/passport-settings", {
    auth: "required",
    authToken,
    body: payload,
    method: "PUT",
  });

export const createJourneyEntry = (
  payload: CreateManualJourneyEntryRequest,
  authToken: string,
) =>
  fphgoFetch<JourneyEntryResponse>("/v1/me/journey", {
    auth: "required",
    authToken,
    body: payload,
    method: "POST",
  });

export const updateJourneyEntry = (
  entryId: string,
  payload: UpdateManualJourneyEntryRequest,
  authToken: string,
) =>
  fphgoFetch<JourneyEntryResponse>(
    `/v1/me/journey/${encodeURIComponent(entryId)}`,
    {
      auth: "required",
      authToken,
      body: payload,
      method: "PATCH",
    },
  );

export const deleteJourneyEntry = (entryId: string, authToken: string) =>
  fphgoFetch<void>(`/v1/me/journey/${encodeURIComponent(entryId)}`, {
    auth: "required",
    authToken,
    method: "DELETE",
  });

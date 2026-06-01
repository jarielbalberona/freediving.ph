import type {
  ProfileBadgesResponse,
  ProfileDiveMapResponse,
  ProfileDiveMemoriesResponse,
  ProfileDivingResponse,
  ProfileJourneyResponse,
  ProfilePassportResponse,
  ProfileViewResponse,
  ProfileResponse,
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

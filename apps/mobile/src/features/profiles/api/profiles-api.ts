import type {
  ProfileDivingResponse,
  ProfilePost,
  ProfilePostsResponse,
  ProfileResponse,
  PublicProfileResponse,
  UpdateMyProfileRequest,
} from "@freediving.ph/types";

import { fphgoFetch } from "@/lib/api";

export const getMyProfile = (authToken: string) =>
  fphgoFetch<ProfileResponse>("/v1/me/profile", {
    auth: "required",
    authToken,
  });

export const getPublicProfileByUsername = (
  username: string,
) =>
  fphgoFetch<PublicProfileResponse>(
    `/v1/profiles/public/${encodeURIComponent(username)}`,
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

export const getProfilePosts = (username: string) =>
  fphgoFetch<ProfilePostsResponse>(
    `/v1/profiles/by-username/${encodeURIComponent(username)}/posts`,
    { auth: "optional" },
  ).then((response) => response.items);

export const getProfileDiving = (username: string) =>
  fphgoFetch<ProfileDivingResponse>(
    `/v1/profiles/${encodeURIComponent(username)}/diving`,
    { auth: "optional" },
  );

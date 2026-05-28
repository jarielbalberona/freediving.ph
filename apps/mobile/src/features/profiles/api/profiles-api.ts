import type {
  ProfileDivingResponse,
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

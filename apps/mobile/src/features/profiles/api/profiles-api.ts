import type {
  ProfileResponse,
  PublicProfileResponse,
} from "@freediving.ph/types";

import { fphgoFetch } from "@/lib/api";

export const getMyProfile = (authToken: string) =>
  fphgoFetch<ProfileResponse>("/v1/me/profile", {
    auth: "required",
    authToken,
  });

export const getPublicProfileByUsername = (
  username: string,
  authToken: string,
) =>
  fphgoFetch<PublicProfileResponse>(
    `/v1/profiles/by-username/${encodeURIComponent(username)}`,
    {
      auth: "required",
      authToken,
    },
  );

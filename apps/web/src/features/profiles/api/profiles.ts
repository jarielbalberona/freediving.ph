import {
  type Profile,
  type ProfileResponse,
  type SearchUsersResponse,
  type UpdateMyProfileRequest,
} from "@freediving.ph/types";

import { fphgoFetchClient } from "@/lib/api/fphgo-fetch";
import { routes } from "@/lib/api/fphgo-routes";

export const profilesApi = {
  getMyProfile: async (): Promise<ProfileResponse> => {
    return fphgoFetchClient<ProfileResponse>(routes.v1.profiles.me());
  },

  getProfileByUserId: async (userId: string): Promise<ProfileResponse> => {
    return fphgoFetchClient<ProfileResponse>(routes.v1.profiles.byUserId(userId));
  },

  updateMyProfile: async (payload: UpdateMyProfileRequest): Promise<ProfileResponse> => {
    return fphgoFetchClient<ProfileResponse>(routes.v1.profiles.me(), {
      method: "PATCH",
      body: payload as Record<string, unknown>,
    });
  },

  searchUsers: async (query: string, limit = 10): Promise<Profile[]> => {
    if (!query.trim()) return [];
    const encoded = encodeURIComponent(query.trim());
    const response = await fphgoFetchClient<SearchUsersResponse>(
      `${routes.v1.profiles.searchUsers()}?q=${encoded}&limit=${limit}`,
    );
    return response.items ?? [];
  },
};

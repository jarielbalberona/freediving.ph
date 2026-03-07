import {
  type ProfileBucketListItem,
  type ProfilePost,
  type Profile,
  type ProfileResponse,
  type PublicProfile,
  type SaveUserResponse,
  type SavedHubResponse,
  type SearchUsersResponse,
  type UpdateMyProfileRequest,
} from "@freediving.ph/types";

import { fphgoFetchClient } from "@/lib/api/fphgo-fetch-client";
import { routes } from "@/lib/api/fphgo-routes";

export const profilesApi = {
  getMyProfile: async (): Promise<ProfileResponse> => {
    return fphgoFetchClient<ProfileResponse>(routes.v1.profiles.me());
  },

  getProfileByUserId: async (userId: string): Promise<ProfileResponse> => {
    return fphgoFetchClient<ProfileResponse>(routes.v1.profiles.byUserId(userId));
  },

  getUserByUsername: async (username: string): Promise<Profile> => {
    const response = await fphgoFetchClient<{
      id: string;
      username: string;
      displayName: string;
      bio: string;
    }>(routes.v1.users.byUsername(username));

    return {
      userId: response.id,
      username: response.username,
      displayName: response.displayName,
      bio: response.bio,
    };
  },

  getPublicProfileByUsername: async (username: string): Promise<PublicProfile> => {
    const response = await fphgoFetchClient<{
      profile: {
        userId: string;
        username: string;
        displayName: string;
        bio: string;
        avatarUrl: string;
        counts: {
          posts: number;
          followers: number;
          following: number;
        };
      };
    }>(routes.v1.profiles.publicByUsername(username));

    return {
      id: response.profile.userId,
      username: response.profile.username,
      displayName: response.profile.displayName,
      bio: response.profile.bio,
      avatarUrl: response.profile.avatarUrl,
      counts: response.profile.counts,
    };
  },

  getPublicProfilePostsByUsername: async (
    username: string,
    limit = 24,
  ): Promise<ProfilePost[]> => {
    const response = await fphgoFetchClient<{ items: ProfilePost[] }>(
      `${routes.v1.profiles.publicPostsByUsername(username)}?limit=${limit}`,
    );
    return response.items ?? [];
  },

  getPublicProfileBucketListByUsername: async (
    username: string,
    limit = 24,
  ): Promise<ProfileBucketListItem[]> => {
    const response = await fphgoFetchClient<{ items: ProfileBucketListItem[] }>(
      `${routes.v1.profiles.publicBucketListByUsername(username)}?limit=${limit}`,
    );
    return response.items ?? [];
  },

  updateMyProfile: async (payload: UpdateMyProfileRequest): Promise<ProfileResponse> => {
    return fphgoFetchClient<ProfileResponse>(routes.v1.profiles.me(), {
      method: "PATCH",
      body: payload as Record<string, unknown>,
    });
  },

  getSavedHub: async (): Promise<SavedHubResponse> => {
    return fphgoFetchClient<SavedHubResponse>(routes.v1.profiles.saved());
  },

  saveUser: async (userId: string): Promise<SaveUserResponse> => {
    return fphgoFetchClient<SaveUserResponse>(routes.v1.profiles.saveUser(userId), {
      method: "POST",
    });
  },

  unsaveUser: async (userId: string): Promise<void> => {
    return fphgoFetchClient<void>(routes.v1.profiles.saveUser(userId), {
      method: "DELETE",
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

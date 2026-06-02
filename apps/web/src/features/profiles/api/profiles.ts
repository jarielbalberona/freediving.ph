import {
  type ProfileDiveMapResponse,
  type ProfileDiveMapSiteResponse,
  type ProfileDiveMemoriesPageResponse,
  type ProfileJourneyResponse,
  type ProfileDiveMemoriesResponse,
  type ProfileDivingResponse,
  type ProfileBadgesResponse,
  type ProfilePassportResponse,
  type PassportSettingsResponse,
  type Profile,
  type ProfileResponse,
  type ProfileView,
  type ProfileViewResponse,
  type SaveUserResponse,
  type SavedHubResponse,
  type SearchUsersResponse,
  type UpsertUserBadgeRequest,
  type CreateManualJourneyEntryRequest,
  type JourneyEntryResponse,
  type UpdateManualJourneyEntryRequest,
  type CreateDiveMemoryRequest,
  type DiveMemoryResponse,
  type DiveMemoryTagsResponse,
  type UpdateDiveMemoryRequest,
  type UpdateDiveMemoryTagRequest,
  type UpdatePassportSettingsRequest,
  type UpdateMyProfileRequest,
  type UserBadgeResponse,
} from "@freediving.ph/types";

import { fphgoFetchClient } from "@/lib/api/fphgo-fetch-client";
import { routes } from "@/lib/api/fphgo-routes";

export const profilesApi = {
  getMyProfile: async (): Promise<ProfileResponse> => {
    return fphgoFetchClient<ProfileResponse>(routes.v1.profiles.me());
  },

  getProfileByUserId: async (userId: string): Promise<ProfileResponse> => {
    return fphgoFetchClient<ProfileResponse>(
      routes.v1.profiles.profile(userId),
    );
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

  getProfileViewByUsername: async (username: string): Promise<ProfileView> => {
    const response = await fphgoFetchClient<ProfileViewResponse>(
      routes.v1.profiles.profile(username),
      { auth: "none" },
    );
    return response.profile;
  },

  getProfileDivingByUsername: async (
    username: string,
  ): Promise<ProfileDivingResponse> => {
    return fphgoFetchClient<ProfileDivingResponse>(
      routes.v1.profiles.profileDiving(username),
      { auth: "ready-only" },
    );
  },

  getProfileDiveMapByUsername: async (
    username: string,
  ): Promise<ProfileDiveMapResponse> => {
    return fphgoFetchClient<ProfileDiveMapResponse>(
      routes.v1.profiles.profileDiveMap(username),
      { auth: "ready-only" },
    );
  },

  getProfileDiveMapSiteByUsername: async (
    username: string,
    siteId: string,
  ): Promise<ProfileDiveMapSiteResponse> => {
    return fphgoFetchClient<ProfileDiveMapSiteResponse>(
      routes.v1.profiles.profileDiveMapSite(username, siteId),
      { auth: "ready-only" },
    );
  },

  getProfileBadgesByUsername: async (
    username: string,
  ): Promise<ProfileBadgesResponse> => {
    return fphgoFetchClient<ProfileBadgesResponse>(
      routes.v1.profiles.profileBadges(username),
      { auth: "ready-only" },
    );
  },

  getProfilePassportByUsername: async (
    username: string,
  ): Promise<ProfilePassportResponse> => {
    return fphgoFetchClient<ProfilePassportResponse>(
      routes.v1.profiles.profilePassport(username),
      { auth: "ready-only" },
    );
  },

  getProfileJourneyByUsername: async (
    username: string,
  ): Promise<ProfileJourneyResponse> => {
    return fphgoFetchClient<ProfileJourneyResponse>(
      routes.v1.profiles.profileJourney(username),
      { auth: "ready-only" },
    );
  },

  getProfileDiveMemoriesByUsername: async (
    username: string,
  ): Promise<ProfileDiveMemoriesResponse> => {
    return fphgoFetchClient<ProfileDiveMemoriesResponse>(
      routes.v1.profiles.profileDiveMemories(username),
      { auth: "ready-only" },
    );
  },

  getProfileDiveMemoriesPageByUsername: async (
    username: string,
    diveSiteSlug: string,
  ): Promise<ProfileDiveMemoriesPageResponse> => {
    return fphgoFetchClient<ProfileDiveMemoriesPageResponse>(
      routes.v1.profiles.profileDiveMemoriesPage(username, diveSiteSlug),
      { auth: "ready-only" },
    );
  },

  getMyDiveMemories: async (): Promise<ProfileDiveMemoriesResponse> => {
    return fphgoFetchClient<ProfileDiveMemoriesResponse>(
      routes.v1.profiles.myDiveMemories(),
    );
  },

  createDiveMemory: async (
    payload: CreateDiveMemoryRequest,
  ): Promise<DiveMemoryResponse> => {
    return fphgoFetchClient<DiveMemoryResponse>(
      routes.v1.profiles.myDiveMemories(),
      {
        method: "POST",
        body: payload as unknown as Record<string, unknown>,
      },
    );
  },

  updateDiveMemory: async (
    memoryId: string,
    payload: UpdateDiveMemoryRequest,
  ): Promise<DiveMemoryResponse> => {
    return fphgoFetchClient<DiveMemoryResponse>(
      routes.v1.profiles.myDiveMemory(memoryId),
      {
        method: "PATCH",
        body: payload as unknown as Record<string, unknown>,
      },
    );
  },

  deleteDiveMemory: async (memoryId: string): Promise<void> => {
    return fphgoFetchClient<void>(routes.v1.profiles.myDiveMemory(memoryId), {
      method: "DELETE",
    });
  },

  getMyDiveMemoryTags: async (): Promise<DiveMemoryTagsResponse> => {
    return fphgoFetchClient<DiveMemoryTagsResponse>(
      routes.v1.profiles.myDiveMemoryTags(),
    );
  },

  updateDiveMemoryTag: async (
    memoryId: string,
    payload: UpdateDiveMemoryTagRequest,
  ): Promise<DiveMemoryTagsResponse> => {
    return fphgoFetchClient<DiveMemoryTagsResponse>(
      routes.v1.profiles.myDiveMemoryTag(memoryId),
      {
        method: "PATCH",
        body: payload as unknown as Record<string, unknown>,
      },
    );
  },

  getMyPassportSettings: async (): Promise<PassportSettingsResponse> => {
    return fphgoFetchClient<PassportSettingsResponse>(
      routes.v1.profiles.myPassportSettings(),
    );
  },

  updateMyPassportSettings: async (
    payload: UpdatePassportSettingsRequest,
  ): Promise<PassportSettingsResponse> => {
    return fphgoFetchClient<PassportSettingsResponse>(
      routes.v1.profiles.myPassportSettings(),
      {
        method: "PUT",
        body: payload as unknown as Record<string, unknown>,
      },
    );
  },

  createJourneyEntry: async (
    payload: CreateManualJourneyEntryRequest,
  ): Promise<JourneyEntryResponse> => {
    return fphgoFetchClient<JourneyEntryResponse>(
      routes.v1.profiles.myJourney(),
      {
        method: "POST",
        body: payload as unknown as Record<string, unknown>,
      },
    );
  },

  updateJourneyEntry: async (
    entryId: string,
    payload: UpdateManualJourneyEntryRequest,
  ): Promise<JourneyEntryResponse> => {
    return fphgoFetchClient<JourneyEntryResponse>(
      routes.v1.profiles.myJourneyEntry(entryId),
      {
        method: "PATCH",
        body: payload as unknown as Record<string, unknown>,
      },
    );
  },

  deleteJourneyEntry: async (entryId: string): Promise<void> => {
    return fphgoFetchClient<void>(routes.v1.profiles.myJourneyEntry(entryId), {
      method: "DELETE",
    });
  },

  getMyBadges: async (): Promise<ProfileBadgesResponse> => {
    return fphgoFetchClient<ProfileBadgesResponse>(
      routes.v1.profiles.myBadges(),
    );
  },

  createBadge: async (
    payload: UpsertUserBadgeRequest,
  ): Promise<UserBadgeResponse> => {
    return fphgoFetchClient<UserBadgeResponse>(routes.v1.profiles.myBadges(), {
      method: "POST",
      body: payload as unknown as Record<string, unknown>,
    });
  },

  updateBadge: async (
    badgeId: string,
    payload: UpsertUserBadgeRequest,
  ): Promise<UserBadgeResponse> => {
    return fphgoFetchClient<UserBadgeResponse>(
      routes.v1.profiles.myBadge(badgeId),
      {
        method: "PATCH",
        body: payload as unknown as Record<string, unknown>,
      },
    );
  },

  deleteBadge: async (badgeId: string): Promise<void> => {
    return fphgoFetchClient<void>(routes.v1.profiles.myBadge(badgeId), {
      method: "DELETE",
    });
  },

  updateMyProfile: async (
    payload: UpdateMyProfileRequest,
  ): Promise<ProfileResponse> => {
    return fphgoFetchClient<ProfileResponse>(routes.v1.profiles.me(), {
      method: "PATCH",
      body: payload as Record<string, unknown>,
    });
  },

  getSavedHub: async (): Promise<SavedHubResponse> => {
    return fphgoFetchClient<SavedHubResponse>(routes.v1.profiles.saved());
  },

  saveUser: async (userId: string): Promise<SaveUserResponse> => {
    return fphgoFetchClient<SaveUserResponse>(
      routes.v1.profiles.saveUser(userId),
      {
        method: "POST",
      },
    );
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

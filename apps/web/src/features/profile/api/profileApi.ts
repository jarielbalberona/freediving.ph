import type {
  ProfileBadgesResponse,
  ProfileDiveMapResponse,
  ProfileDiveMapSiteResponse,
  ProfileDivingResponse,
  ProfileJourneyResponse,
  ProfilePassportResponse,
  PassportSettingsResponse,
  UpdatePassportSettingsRequest,
  ProfileView,
  CreateManualJourneyEntryRequest,
  JourneyEntryResponse,
} from "@freediving.ph/types";

import { profilesApi } from "@/features/profiles/api/profiles";
import { normalizeUsername } from "@/lib/routes";

export const profileApi = {
  async getProfileView(username: string): Promise<ProfileView> {
    return profilesApi.getProfileViewByUsername(normalizeUsername(username));
  },

  async getProfileDiving(username: string): Promise<ProfileDivingResponse> {
    return profilesApi.getProfileDivingByUsername(normalizeUsername(username));
  },

  async getProfileDiveMap(username: string): Promise<ProfileDiveMapResponse> {
    return profilesApi.getProfileDiveMapByUsername(normalizeUsername(username));
  },

  async getProfileDiveMapSite(
    username: string,
    siteId: string,
  ): Promise<ProfileDiveMapSiteResponse> {
    return profilesApi.getProfileDiveMapSiteByUsername(
      normalizeUsername(username),
      siteId,
    );
  },

  async getProfileBadges(username: string): Promise<ProfileBadgesResponse> {
    return profilesApi.getProfileBadgesByUsername(normalizeUsername(username));
  },

  async getProfileJourney(username: string): Promise<ProfileJourneyResponse> {
    return profilesApi.getProfileJourneyByUsername(normalizeUsername(username));
  },

  async getProfilePassport(username: string): Promise<ProfilePassportResponse> {
    return profilesApi.getProfilePassportByUsername(normalizeUsername(username));
  },

  async getMyPassportSettings(): Promise<PassportSettingsResponse> {
    return profilesApi.getMyPassportSettings();
  },

  async updateMyPassportSettings(
    payload: UpdatePassportSettingsRequest,
  ): Promise<PassportSettingsResponse> {
    return profilesApi.updateMyPassportSettings(payload);
  },

  async createJourneyEntry(
    payload: CreateManualJourneyEntryRequest,
  ): Promise<JourneyEntryResponse> {
    return profilesApi.createJourneyEntry(payload);
  },

  async deleteJourneyEntry(entryId: string): Promise<void> {
    return profilesApi.deleteJourneyEntry(entryId);
  },
};

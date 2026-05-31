import type {
  ProfileBadgesResponse,
  ProfileDiveMapResponse,
  ProfileDiveMapSiteResponse,
  ProfileDivingResponse,
  ProfileView,
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
};

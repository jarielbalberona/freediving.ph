import type {
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
    return profilesApi.getProfileDivingByUsername(
      normalizeUsername(username),
    );
  },
};

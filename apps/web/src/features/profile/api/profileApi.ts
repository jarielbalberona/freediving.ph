import type {
  ProfileBucketListItem,
  ProfilePost,
  PublicProfile,
} from "@freediving.ph/types";

import { profilesApi } from "@/features/profiles/api/profiles";
import { normalizeUsername } from "@/lib/routes";

export const profileApi = {
  async getPublicProfile(username: string): Promise<PublicProfile> {
    return profilesApi.getPublicProfileByUsername(normalizeUsername(username));
  },

  async getProfilePosts(username: string): Promise<ProfilePost[]> {
    return profilesApi.getPublicProfilePostsByUsername(
      normalizeUsername(username),
    );
  },

  async getProfileBucketList(
    username: string,
  ): Promise<ProfileBucketListItem[]> {
    return profilesApi.getPublicProfileBucketListByUsername(
      normalizeUsername(username),
    );
  },
};

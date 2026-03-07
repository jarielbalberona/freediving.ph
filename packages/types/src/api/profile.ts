export type Profile = {
  userId: string;
  username: string;
  displayName: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  buddyCount?: number;
  reportCount?: number;
  bio?: string;
  avatarUrl?: string;
  location?: string;
  homeArea?: string;
  interests?: string[];
  certLevel?: string;
  socials?: Record<string, string>;
};

export type ProfileResponse = {
  profile: Profile;
};

export type SearchUsersResponse = {
  items: Profile[];
};

export type SavedSite = {
  id: string;
  slug: string;
  name: string;
  area: string;
  difficulty: string;
  lastUpdatedAt: string;
  lastConditionSummary?: string;
  savedAt: string;
};

export type SavedUser = {
  userId: string;
  username: string;
  displayName: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  avatarUrl?: string;
  homeArea?: string;
  certLevel?: string;
  buddyCount: number;
  reportCount: number;
  savedAt: string;
};

export type SavedHubResponse = {
  sites: SavedSite[];
  users: SavedUser[];
};

export type UpdateMyProfileRequest = {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  location?: string;
  homeArea?: string;
  interests?: string[];
  certLevel?: string;
  socials?: {
    website?: string;
    instagram?: string;
    x?: string;
    facebook?: string;
    tiktok?: string;
    youtube?: string;
  };
};

export type Profile = {
  userId: string;
  username: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  location?: string;
  socials?: Record<string, string>;
};

export type ProfileResponse = {
  profile: Profile;
};

export type SearchUsersResponse = {
  items: Profile[];
};

export type UpdateMyProfileRequest = {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  location?: string;
  socials?: {
    website?: string;
    instagram?: string;
    x?: string;
    facebook?: string;
    tiktok?: string;
    youtube?: string;
  };
};

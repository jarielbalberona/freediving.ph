export type ProfileBucketListItem = {
  siteId: string;
  siteSlug: string;
  siteName: string;
  siteArea: string;
  pinnedAt: string;
  hasDived: boolean;
};

export type PublicProfile = {
  id: string;
  username: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  counts: {
    posts: number;
    followers: number;
    following: number;
  };
};

export type ProfilePost = {
  id: string;
  siteId: string;
  siteSlug: string;
  siteName: string;
  siteArea: string;
  caption: string;
  occurredAt: string;
  thumbUrl: string;
  mediaType: "image" | "video";
  likeCount: number;
  commentCount: number;
};

export type ProfileDivePresence = {
  id: string;
  diveSiteId: string;
  diveSiteSlug: string;
  diveSiteName: string;
  diveSiteArea?: string;
  presenceType: "available" | "planning" | "training" | "fun_dive";
  startAt?: string;
  endAt?: string;
  visibility: "public" | "members" | "private";
  contactEnabled: boolean;
  viewerCanContact: boolean;
  note?: string;
  createdAt: string;
};

export type ProfileDiveSiteAffinity = {
  id: string;
  diveSiteId: string;
  diveSiteSlug: string;
  diveSiteName: string;
  diveSiteArea?: string;
  relationship: "local" | "regular" | "instructor" | "operator" | "interested";
  visibility: "public" | "members" | "private";
  contactEnabled: boolean;
  viewerCanContact: boolean;
  note?: string;
  createdAt: string;
  updatedAt: string;
};

export type ProfileDivingResponse = {
  presences: ProfileDivePresence[];
  affinities: ProfileDiveSiteAffinity[];
};

export type ProfileBucketListItem = {
  siteId: string;
  siteSlug: string;
  siteName: string;
  siteArea: string;
  pinnedAt: string;
  hasDived: boolean;
};

export type ProfileViewerRelationship = {
  isSelf: boolean;
  isFollowing: boolean;
  isBlocked: boolean;
  hasBlockedViewer: boolean;
  canMessage: boolean;
  canFollow: boolean;
  canEdit: boolean;
};

export type ProfileView = {
  id: string;
  username: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  locationText?: string;
  createdAt: string;
  counts: {
    mediaPosts: number;
    followers: number;
    following: number;
  };
  viewerRelationship: ProfileViewerRelationship;
};

export type ProfileViewResponse = {
  profile: ProfileView;
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

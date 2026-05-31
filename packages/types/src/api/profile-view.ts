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

export type ProfileDiveMapMarker = {
  diveSiteId: string;
  diveSiteSlug: string;
  diveSiteName: string;
  diveSiteArea: string;
  latitude?: number;
  longitude?: number;
  firstPostId: string;
  firstVisitedAt: string;
  lastPostId: string;
  lastVisitedAt: string;
  mediaPostCount: number;
  visibility: "public" | "members" | "private";
  unlockedAt: string;
  lastProofAddedAt: string;
};

export type ProfileDiveMapProofMedia = {
  postId: string;
  mediaItemId: string;
  mediaObjectId: string;
  type: "photo" | "video";
  url: string;
  mimeType: string;
  width: number;
  height: number;
  caption?: string;
  createdAt: string;
};

export type ProfileDiveMapMemory = {
  id: string;
  authorUserId: string;
  diveSiteId: string;
  title: string;
  body?: string;
  mediaIds: string[];
  visibility: "public" | "followers" | "tagged" | "private";
  occurredAt: string;
  createdAt: string;
  updatedAt: string;
};

export type ProfileDiveMapResponse = {
  visitedSiteCount: number;
  markers: ProfileDiveMapMarker[];
};

export type ProfileDiveMapSiteResponse = {
  marker: ProfileDiveMapMarker;
  media: ProfileDiveMapProofMedia[];
  memories: ProfileDiveMapMemory[];
};

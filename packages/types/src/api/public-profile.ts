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

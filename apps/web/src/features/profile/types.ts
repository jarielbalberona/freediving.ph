export type { ProfileBucketListItem, ProfileView } from "@freediving.ph/types";

export type ProfilePost = {
  id: string;
  thumbUrl?: string;
  mediaType: "image" | "video";
  likeCount: number;
  commentCount: number;
};

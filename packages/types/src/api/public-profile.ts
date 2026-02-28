export type PublicProfileHighlight = {
  id: string;
  title: string;
  coverUrl?: string;
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
  highlights: PublicProfileHighlight[];
};

export type ProfilePost = {
  id: string;
  thumbUrl: string;
  mediaType: "image" | "video";
  likeCount?: number;
  commentCount?: number;
};

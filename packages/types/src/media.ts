export const mediaContextTypes = [
  "profile_avatar",
  "profile_feed",
  "chika_attachment",
  "event_attachment",
  "dive_spot_attachment",
  "group_cover",
] as const;

export type MediaContextType = (typeof mediaContextTypes)[number];

export const mediaPresets = ["thumb", "card", "dialog", "original"] as const;

export type MediaPreset = (typeof mediaPresets)[number];

export type MediaObjectState = "active" | "hidden" | "deleted";
export type MediaPostSource = "create_post" | "profile_upload";
export type MediaItemType = "photo" | "video";
export type MediaItemStatus = "active" | "hidden" | "deleted";

export interface MediaObject {
  id: string;
  ownerAppUserId: string;
  contextType: MediaContextType;
  contextId?: string | null;
  objectKey: string;
  mimeType: string;
  sizeBytes: number;
  width: number;
  height: number;
  state: MediaObjectState;
  createdAt?: string;
}

export interface MediaUploadResponse {
  id: string;
  objectKey: string;
  mimeType: string;
  sizeBytes: number;
  width: number;
  height: number;
  contextType: MediaContextType;
  contextId?: string | null;
  state: MediaObjectState;
}

export interface ListMyMediaResponse {
  items: MediaUploadResponse[];
  nextCursor?: string;
}

export interface MintMediaUrlItemRequest {
  mediaId: string;
  preset: MediaPreset;
  width?: number;
  format?: "auto" | "webp" | "jpeg" | "png";
  quality?: number;
}

export interface MintMediaUrlsRequest {
  items: MintMediaUrlItemRequest[];
}

export interface MintMediaUrlItem {
  mediaId: string;
  url: string;
  expiresAt: number;
}

export interface MintMediaUrlErrorItem {
  mediaId: string;
  code: string;
  message: string;
}

export interface MintMediaUrlsResponse {
  items: MintMediaUrlItem[];
  errors?: MintMediaUrlErrorItem[];
}

export interface CreateMediaPostItemRequest {
  mediaObjectId: string;
  type: MediaItemType;
  storageKey: string;
  mimeType: string;
  width: number;
  height: number;
  durationMs?: number | null;
  caption?: string | null;
  diveSiteId?: string | null;
  sortOrder: number;
}

export interface CreateMediaPostRequest {
  diveSiteId: string;
  postCaption?: string | null;
  applyCaptionToAll?: boolean;
  source?: MediaPostSource;
  items: CreateMediaPostItemRequest[];
}

export interface MediaDiveSiteSummary {
  id: string;
  slug?: string;
  name: string;
  area: string;
}

export interface MediaPostSummary {
  id: string;
  authorAppUserId: string;
  uploadGroupId: string;
  diveSiteId: string;
  postCaption?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileMediaItem {
  id: string;
  mediaObjectId: string;
  postId: string;
  uploadGroupId: string;
  authorAppUserId: string;
  type: MediaItemType;
  storageKey: string;
  mimeType: string;
  width: number;
  height: number;
  durationMs?: number | null;
  caption?: string | null;
  diveSite: MediaDiveSiteSummary;
  sortOrder: number;
  status: MediaItemStatus;
  createdAt: string;
}

export interface CreateMediaPostResponse {
  post: MediaPostSummary;
  items: ProfileMediaItem[];
}

export interface ListProfileMediaResponse {
  items: ProfileMediaItem[];
  nextCursor?: string;
}

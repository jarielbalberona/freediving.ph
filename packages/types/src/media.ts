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

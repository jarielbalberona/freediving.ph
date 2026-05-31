export const mediaContextTypes = [
  "profile_avatar",
  "profile_feed",
  "chika_attachment",
  "event_attachment",
  "event_logo",
  "event_cover",
  "school_logo",
  "school_cover",
  "payment_method_qr",
  "course_booking_receipt",
  "dive_spot_attachment",
  "group_logo",
  "group_cover",
  "instructor_certification_proof",
] as const;

export type MediaContextType = (typeof mediaContextTypes)[number];

export const mediaPresets = ["thumb", "card", "dialog", "original"] as const;

export type MediaPreset = (typeof mediaPresets)[number];

export type MediaObjectState = "active" | "hidden" | "deleted";
export type MediaPostSource = "create_post" | "profile_upload" | "moment_upload";
export type MediaItemType = "photo" | "video";
export type MediaItemStatus = "active" | "hidden" | "deleted";
export type MomentProcessingStatus =
  | "draft"
  | "upload_requested"
  | "uploading"
  | "uploaded"
  | "processing"
  | "ready"
  | "failed"
  | "rejected";

export interface MomentPlayback {
  provider: "cloudflare_stream";
  iframeUrl: string | null;
  hlsUrl: string | null;
  dashUrl?: string | null;
  posterUrl?: string | null;
}

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
  diveSiteId?: string | null;
  postCaption?: string | null;
  likeCount: number;
  commentCount: number;
  viewerHasLiked: boolean;
  viewerHasSaved: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileMediaItem {
  id: string;
  mediaObjectId: string;
  postId: string;
  postCaption?: string | null;
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
  processingStatus?: MomentProcessingStatus;
  playback?: MomentPlayback | null;
  playbackUrl?: string | null;
  thumbnailUrl?: string | null;
  previewUrl?: string | null;
  likeCount: number;
  commentCount: number;
  viewerHasLiked: boolean;
  viewerHasSaved: boolean;
  createdAt: string;
}

export interface CreateMediaPostResponse {
  post: MediaPostSummary;
  items: ProfileMediaItem[];
}

export interface CreateMomentUploadIntentRequest {
  caption?: string | null;
  diveSiteId?: string | null;
  filename?: string | null;
  contentType?: string | null;
}

export interface MomentUploadIntentResponse {
  postId: string;
  mediaItemId: string;
  mediaObjectId: string;
  streamUid: string;
  uploadUrl: string;
  status: MomentProcessingStatus;
  uploadExpiresAt: string;
  maxDurationSeconds: number;
}

export interface MomentStatusResponse {
  postId: string;
  mediaItemId: string;
  status: MomentProcessingStatus;
  playback?: MomentPlayback | null;
  playbackUrl?: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  durationMs?: number | null;
  width: number;
  height: number;
  failedReason?: string | null;
  uploadExpiresAt?: string | null;
  readyAt?: string | null;
}

export interface MediaPostAuthor {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
}

export interface MediaPostDetail {
  post: MediaPostSummary;
  author: MediaPostAuthor;
  items: ProfileMediaItem[];
}

export interface MediaPostDetailResponse {
  post: MediaPostDetail;
}

export interface MediaPostLikeState {
  postId: string;
  likeCount: number;
  viewerHasLiked: boolean;
}

export interface LikeState {
  targetId: string;
  likeCount: number;
  viewerHasLiked: boolean;
}

export interface MediaPostSaveState {
  postId: string;
  viewerHasSaved: boolean;
}

export interface MediaPostCommentAuthor {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
}

export interface MediaPostComment {
  id: string;
  postId: string;
  author: MediaPostCommentAuthor;
  body: string;
  likeCount: number;
  viewerHasLiked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MediaPostCommentListResponse {
  items: MediaPostComment[];
  nextCursor?: string;
}

export interface MediaPostCommentLikeState {
  commentId: string;
  likeCount: number;
  viewerHasLiked: boolean;
}

export interface ListProfileMediaResponse {
  items: ProfileMediaItem[];
  nextCursor?: string;
}

export interface DiveSpotHighlight {
  diveSpotId: string;
  diveSpotSlug?: string;
  diveSpotName: string;
  diveSpotArea?: string;
  coverMediaObjectId: string;
  coverThumbnailUrl?: string;
  mediaCount: number;
  latestMediaCreatedAt: string;
}

export interface ListDiveSpotHighlightsResponse {
  items: DiveSpotHighlight[];
}

export type DiveMemoryVisibility =
  | "public"
  | "followers"
  | "tagged"
  | "private";

export type DiveMemoryTagStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "hidden";

export interface DiveMemory {
  id: string;
  authorUserId: string;
  diveSiteId: string;
  title: string;
  body?: string;
  mediaIds: string[];
  visibility: DiveMemoryVisibility;
  occurredAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface DiveMemoryTag {
  id: string;
  memoryId: string;
  taggedUserId: string;
  status: DiveMemoryTagStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileDiveMemoriesResponse {
  items: DiveMemory[];
}

export interface DiveMemoryResponse {
  memory: DiveMemory;
}

export interface DiveMemoryTagsResponse {
  items: DiveMemoryTag[];
}

export interface UpsertDiveMemoryRequest {
  diveSiteId: string;
  title: string;
  body?: string;
  visibility?: DiveMemoryVisibility;
  occurredAt?: string;
  mediaIds?: string[];
}

export type CreateDiveMemoryRequest = UpsertDiveMemoryRequest;

export type UpdateDiveMemoryRequest = UpsertDiveMemoryRequest;

export interface AddDiveMemoryTagsRequest {
  taggedUserIds: string[];
}

export interface UpdateDiveMemoryTagRequest {
  status: Exclude<DiveMemoryTagStatus, "pending">;
}

export interface DiveMemoriesPageProfile {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  viewerIsOwner: boolean;
}

export interface DiveMemoriesPageSite {
  diveSiteId: string;
  slug: string;
  name: string;
  area: string;
  latitude?: number;
  longitude?: number;
}

export interface DiveMemoriesPageEntry {
  firstProofAt: string;
  lastProofAt: string;
  lastUpdatedAt: string;
  proofCount: number;
  memoryCount: number;
  mediaCount: number;
  textCount: number;
  viewerCanCreateMemory: boolean;
  viewerCanManageMemories: boolean;
}

export interface DiveMemoriesPageMediaAsset {
  id: string;
  url: string;
  mimeType: string;
  width: number;
  height: number;
  type: "photo" | "video";
}

export interface DiveMemoriesPageProofItem {
  id: string;
  kind: "proof_media_post";
  postId: string;
  mediaItemId: string;
  mediaObjectId: string;
  media: DiveMemoriesPageMediaAsset;
  caption?: string;
  createdAt: string;
  proofLabel: string;
}

export interface DiveMemoriesPageMemoryAttachment {
  id: string;
  mediaObjectId: string;
  media: DiveMemoriesPageMediaAsset;
  createdAt: string;
}

export interface DiveMemoriesPageMemoryAuthor {
  userId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
}

export interface DiveMemoriesPageMemoryItem {
  id: string;
  kind: "dive_memory";
  author: DiveMemoriesPageMemoryAuthor;
  title: string;
  body?: string;
  visibility: DiveMemoryVisibility;
  occurredAt: string;
  createdAt: string;
  updatedAt: string;
  attachments: DiveMemoriesPageMemoryAttachment[];
  viewerCanEdit: boolean;
  viewerCanDelete: boolean;
}

export interface DiveMemoriesPageLimits {
  proofItems: number;
  memoryItems: number;
}

export interface ProfileDiveMemoriesPageResponse {
  profile: DiveMemoriesPageProfile;
  site: DiveMemoriesPageSite;
  entry: DiveMemoriesPageEntry;
  proofItems: DiveMemoriesPageProofItem[];
  memoryItems: DiveMemoriesPageMemoryItem[];
  limits: DiveMemoriesPageLimits;
}

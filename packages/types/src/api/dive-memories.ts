export type DiveMemoryVisibility = "public" | "followers" | "tagged" | "private";

export type DiveMemoryTagStatus = "pending" | "accepted" | "declined" | "hidden";

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

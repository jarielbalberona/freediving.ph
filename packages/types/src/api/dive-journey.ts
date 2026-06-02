export type JourneyEntryType =
  | "memory"
  | "map_milestone"
  | "badge"
  | "event"
  | "media"
  | "custom";

export type JourneyEntryVisibility = "public" | "followers" | "private";

export type JourneyEntryState = "active" | "hidden" | "deleted";

export type JourneySourceType =
  | "memory"
  | "dive_map"
  | "badge"
  | "event"
  | "course"
  | "media"
  | "manual";

export type JourneyTaggedUserStatus = "tagged" | "removed";

export interface JourneyTaggedUser {
  userId: string;
  username?: string;
  displayName?: string;
  status: JourneyTaggedUserStatus;
}

export interface JourneyEntry {
  id: string;
  userId: string;
  type: JourneyEntryType;
  title: string;
  body?: string;
  diveSiteId?: string;
  sourceType?: JourneySourceType | string;
  sourceId?: string;
  coverMediaId?: string;
  mediaIds: string[];
  taggedUsers?: JourneyTaggedUser[];
  visibility: JourneyEntryVisibility;
  visibilityLabel?: string;
  state: JourneyEntryState;
  occurredAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileJourneyResponse {
  items: JourneyEntry[];
}

export interface JourneyEntryResponse {
  entry: JourneyEntry;
}

export interface UpsertManualJourneyEntryRequest {
  title: string;
  body?: string;
  diveSiteId?: string;
  visibility?: JourneyEntryVisibility;
  occurredAt?: string;
  mediaIds?: string[];
}

export type CreateManualJourneyEntryRequest = UpsertManualJourneyEntryRequest;

export type UpdateManualJourneyEntryRequest = UpsertManualJourneyEntryRequest;

export interface HideJourneyEntryRequest {
  hidden: boolean;
}

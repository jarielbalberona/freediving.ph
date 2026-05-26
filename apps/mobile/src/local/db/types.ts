export type LocalDraftType =
  | "chika_thread"
  | "chika_comment"
  | "post_composer"
  | "media_post_metadata"
  | "profile_edit"
  | "buddy_intent"
  | "event_post"
  | "group_post";

export type LocalDraftStatus = "draft" | "submitting" | "submitted" | "discarded";

export type SyncOutboxStatus = "pending" | "syncing" | "synced" | "failed" | "discarded";

export type SyncOperationType =
  | "chika_thread_create"
  | "chika_comment_create"
  | "profile_edit_update"
  | "buddy_intent_create"
  | "event_post_create"
  | "event_post_fish"
  | "group_post_create"
  | "chika_thread_reaction"
  | "chika_comment_reaction"
  | "explore_site_like"
  | "explore_site_save"
  | "event_interest";

export type SyncEntityType =
  | "chika_thread"
  | "chika_comment"
  | "profile"
  | "buddy_intent"
  | "event"
  | "event_post"
  | "group"
  | "group_post"
  | "explore_site";

export type OfflineClassification = "draft_only" | "queue_safe" | "online_only" | "unsupported";

export type LocalDraftRecord<TPayload = Record<string, unknown>> = {
  id: string;
  type: LocalDraftType;
  payload: TPayload;
  status: LocalDraftStatus;
  createdAt: string;
  updatedAt: string;
};

export type SyncOutboxRecord<TPayload = Record<string, unknown>> = {
  id: string;
  operationType: SyncOperationType;
  entityType: SyncEntityType;
  entityId?: string;
  idempotencyKey: string;
  payload: TPayload;
  status: SyncOutboxStatus;
  attemptCount: number;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
  syncedAt?: string;
};

export type LocalMediaQueueStatus = "pending" | "uploading" | "uploaded" | "failed" | "discarded";

export type LocalMediaQueueRecord<TUploadIntent = Record<string, unknown>> = {
  id: string;
  localUri: string;
  uploadIntent: TUploadIntent;
  entityType: SyncEntityType;
  entityId?: string;
  status: LocalMediaQueueStatus;
  remoteMediaId?: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
};

export const LOCAL_SCHEMA_VERSION = 1;

export const OFFLINE_OPERATION_CLASSIFICATION: Record<string, OfflineClassification> = {
  buddy_intent_create: "draft_only",
  buddy_intent_delete: "online_only",
  chika_comment_create: "draft_only",
  chika_comment_reaction: "queue_safe",
  chika_thread_create: "draft_only",
  chika_thread_reaction: "queue_safe",
  event_interest: "queue_safe",
  event_join_leave: "online_only",
  event_post_create: "draft_only",
  event_post_fish: "queue_safe",
  explore_site_like: "queue_safe",
  explore_site_save: "queue_safe",
  explore_site_submit: "online_only",
  feed_action: "online_only",
  group_join_leave: "online_only",
  group_post_create: "draft_only",
  media_upload: "draft_only",
  message_send: "online_only",
  notification_mark_read: "unsupported",
  profile_edit_update: "draft_only",
};

export const nowIso = () => new Date().toISOString();

export const makeLocalId = (prefix: string) =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

export const makeIdempotencyKey = (operationType: SyncOperationType, id: string) =>
  `mobile:${operationType}:${id}`;

export const encodePayload = (payload: Record<string, unknown>) => {
  const encoded = JSON.stringify(payload);
  JSON.parse(encoded);
  return encoded;
};

export const decodePayload = <TPayload = Record<string, unknown>>(
  payloadJson: string,
): TPayload => {
  const parsed = JSON.parse(payloadJson);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Local payload is not a JSON object.");
  }
  return parsed as TPayload;
};

import {
  OFFLINE_OPERATION_CLASSIFICATION,
  type SyncOperationType,
} from "@/local/db/types";

export const QUEUEABLE_OPERATION_TYPES: SyncOperationType[] = [
  "buddy_intent_create",
  "chika_comment_create",
  "chika_comment_reaction",
  "chika_thread_create",
  "chika_thread_reaction",
  "event_interest",
  "event_post_create",
  "event_post_fish",
  "explore_site_like",
  "explore_site_save",
  "group_post_create",
  "profile_edit_update",
];

export const isQueueableOperation = (operationType: string) =>
  OFFLINE_OPERATION_CLASSIFICATION[operationType] === "queue_safe" &&
  QUEUEABLE_OPERATION_TYPES.includes(operationType as SyncOperationType);

export const assertQueueableOperation = (operationType: SyncOperationType) => {
  if (!isQueueableOperation(operationType)) {
    throw new Error(`Operation cannot be queued offline: ${operationType}`);
  }
};

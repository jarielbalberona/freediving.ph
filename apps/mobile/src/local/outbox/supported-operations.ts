import {
  type OfflineClassification,
  OFFLINE_OPERATION_CLASSIFICATION,
  type SyncOperationType,
} from "@/local/db/types";
import { FphgoApiError } from "@/lib/api";

type QueueableOperationSafety = {
  auth: "required";
  conflictBehavior: string;
  endpoint: string;
  idempotencySupport: "server_state_idempotent";
  requiredBooleanKeys?: string[];
  requiredStringKeys: string[];
  responseShape: string;
};

export const QUEUEABLE_OPERATION_TYPES = [
  "chika_comment_reaction",
  "chika_thread_reaction",
  "event_interest",
  "event_post_fish",
  "explore_site_like",
  "explore_site_save",
] satisfies SyncOperationType[];

type QueueableOperationType = (typeof QUEUEABLE_OPERATION_TYPES)[number];

export const QUEUEABLE_OPERATION_SAFETY: Record<
  QueueableOperationType,
  QueueableOperationSafety
> = {
  chika_comment_reaction: {
    auth: "required",
    conflictBehavior: "sets or removes the current member reaction",
    endpoint: "/v1/chika/comments/{commentId}/reactions",
    idempotencySupport: "server_state_idempotent",
    requiredStringKeys: ["commentId"],
    responseShape: "ChikaCommentReactionResponse or 204",
  },
  chika_thread_reaction: {
    auth: "required",
    conflictBehavior: "sets or removes the current member reaction",
    endpoint: "/v1/chika/threads/{threadId}/reactions",
    idempotencySupport: "server_state_idempotent",
    requiredStringKeys: ["threadId"],
    responseShape: "ChikaThreadReactionResponse or 204",
  },
  event_interest: {
    auth: "required",
    conflictBehavior: "sets or removes the current member interest state",
    endpoint: "/v1/events/{eventId}/interest",
    idempotencySupport: "server_state_idempotent",
    requiredBooleanKeys: ["viewerInterested"],
    requiredStringKeys: ["eventId"],
    responseShape: "EventDetailResponse",
  },
  event_post_fish: {
    auth: "required",
    conflictBehavior: "sets or removes the current member fish reaction",
    endpoint: "/v1/events/{eventId}/updates/{postId}/reactions/fish",
    idempotencySupport: "server_state_idempotent",
    requiredBooleanKeys: ["viewerHasFishReacted"],
    requiredStringKeys: ["eventId", "postId"],
    responseShape: "EventPostReactionResponse",
  },
  explore_site_like: {
    auth: "required",
    conflictBehavior: "sets or removes the current member like state",
    endpoint: "/v1/explore/sites/{siteId}/likes",
    idempotencySupport: "server_state_idempotent",
    requiredBooleanKeys: ["viewerHasLiked"],
    requiredStringKeys: ["siteId"],
    responseShape: "ExploreSiteLikeResponse",
  },
  explore_site_save: {
    auth: "required",
    conflictBehavior: "sets or removes the current member saved-site state",
    endpoint: "/v1/explore/sites/{siteId}/save",
    idempotencySupport: "server_state_idempotent",
    requiredBooleanKeys: ["isSaved"],
    requiredStringKeys: ["siteId"],
    responseShape: "ExploreSiteSaveResponse or 204",
  },
};

export const isQueueableOperation = (operationType: string) =>
  OFFLINE_OPERATION_CLASSIFICATION[operationType] === "queue_safe" &&
  (QUEUEABLE_OPERATION_TYPES as readonly string[]).includes(operationType);

export const assertQueueableOperation = (operationType: SyncOperationType) => {
  if (!isQueueableOperation(operationType)) {
    throw new Error(`Operation cannot be queued offline: ${operationType}`);
  }
};

const assertRequiredStringPayload = (
  payload: Record<string, unknown>,
  operationType: SyncOperationType,
  key: string,
) => {
  const value = payload[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Pending change is missing ${key} for ${operationType}.`);
  }
};

const assertRequiredBooleanPayload = (
  payload: Record<string, unknown>,
  operationType: SyncOperationType,
  key: string,
) => {
  if (typeof payload[key] !== "boolean") {
    throw new Error(`Pending change is missing ${key} for ${operationType}.`);
  }
};

export const assertQueueablePayload = (
  operationType: SyncOperationType,
  payload: Record<string, unknown>,
) => {
  assertQueueableOperation(operationType);
  const safety = QUEUEABLE_OPERATION_SAFETY[operationType as QueueableOperationType];

  for (const key of safety.requiredStringKeys) {
    assertRequiredStringPayload(payload, operationType, key);
  }
  for (const key of safety.requiredBooleanKeys ?? []) {
    assertRequiredBooleanPayload(payload, operationType, key);
  }

  if (
    operationType === "chika_thread_reaction" ||
    operationType === "chika_comment_reaction"
  ) {
    const type = payload.type;
    if (
      type !== undefined &&
      type !== null &&
      type !== "upvote" &&
      type !== "downvote"
    ) {
      throw new Error(`Pending Chika vote is invalid for ${operationType}.`);
    }
  }
};

export const shouldQueueFailedMutation = (error: unknown) => {
  if (!(error instanceof FphgoApiError)) return true;
  if (error.status === 408 || error.status === 429) return true;
  return error.status >= 500;
};

export const getOfflineClassification = (
  operationType: string,
): OfflineClassification =>
  OFFLINE_OPERATION_CLASSIFICATION[operationType] ?? "unsupported";

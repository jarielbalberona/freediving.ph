import { fphgoFetch } from "@/lib/api";
import type { SyncOutboxRecord } from "@/local/db/types";
import {
  listOutboxItems,
  markOutboxFailed,
  markOutboxSynced,
  markOutboxSyncing,
} from "@/local/outbox/outbox-repository";
import { assertQueueableOperation } from "@/local/outbox/supported-operations";

export type SyncResult = {
  failed: number;
  synced: number;
};

const stringValue = (payload: Record<string, unknown>, key: string) => {
  const value = payload[key];
  return typeof value === "string" ? value : "";
};

const optionalString = (payload: Record<string, unknown>, key: string) => {
  const value = payload[key];
  return typeof value === "string" && value.trim() ? value : undefined;
};

const executeOutboxItem = async (
  item: SyncOutboxRecord,
  authToken: string,
) => {
  assertQueueableOperation(item.operationType);
  const payload = item.payload;

  switch (item.operationType) {
    case "chika_thread_reaction": {
      const type = optionalString(payload, "type");
      return type === "upvote" || type === "downvote"
        ? fphgoFetch(
            `/v1/chika/threads/${encodeURIComponent(stringValue(payload, "threadId"))}/reactions`,
            {
              auth: "required",
              authToken,
              body: { type },
              idempotencyKey: item.idempotencyKey,
              method: "POST",
            },
          )
        : fphgoFetch(
            `/v1/chika/threads/${encodeURIComponent(stringValue(payload, "threadId"))}/reactions`,
            {
              auth: "required",
              authToken,
              idempotencyKey: item.idempotencyKey,
              method: "DELETE",
            },
          );
    }
    case "chika_comment_reaction": {
      const type = optionalString(payload, "type");
      return type === "upvote" || type === "downvote"
        ? fphgoFetch(
            `/v1/chika/comments/${encodeURIComponent(stringValue(payload, "commentId"))}/reactions`,
            {
              auth: "required",
              authToken,
              body: { type },
              idempotencyKey: item.idempotencyKey,
              method: "POST",
            },
          )
        : fphgoFetch(
            `/v1/chika/comments/${encodeURIComponent(stringValue(payload, "commentId"))}/reactions`,
            {
              auth: "required",
              authToken,
              idempotencyKey: item.idempotencyKey,
              method: "DELETE",
            },
          );
    }
    case "event_post_fish":
      return payload.viewerHasFishReacted
        ? fphgoFetch(
            `/v1/events/${encodeURIComponent(stringValue(payload, "eventId"))}/updates/${encodeURIComponent(stringValue(payload, "postId"))}/reactions/fish`,
            {
              auth: "required",
              authToken,
              idempotencyKey: item.idempotencyKey,
              method: "DELETE",
            },
          )
        : fphgoFetch(
            `/v1/events/${encodeURIComponent(stringValue(payload, "eventId"))}/updates/${encodeURIComponent(stringValue(payload, "postId"))}/reactions/fish`,
            {
              auth: "required",
              authToken,
              idempotencyKey: item.idempotencyKey,
              method: "POST",
            },
          );
    case "explore_site_like":
      return payload.viewerHasLiked
        ? fphgoFetch(
            `/v1/explore/sites/${encodeURIComponent(stringValue(payload, "siteId"))}/likes`,
            {
              auth: "required",
              authToken,
              idempotencyKey: item.idempotencyKey,
              method: "DELETE",
            },
          )
        : fphgoFetch(
            `/v1/explore/sites/${encodeURIComponent(stringValue(payload, "siteId"))}/likes`,
            {
              auth: "required",
              authToken,
              idempotencyKey: item.idempotencyKey,
              method: "POST",
            },
          );
    case "explore_site_save":
      return payload.isSaved
        ? fphgoFetch(
            `/v1/explore/sites/${encodeURIComponent(stringValue(payload, "siteId"))}/save`,
            {
              auth: "required",
              authToken,
              idempotencyKey: item.idempotencyKey,
              method: "DELETE",
            },
          )
        : fphgoFetch(
            `/v1/explore/sites/${encodeURIComponent(stringValue(payload, "siteId"))}/save`,
            {
              auth: "required",
              authToken,
              idempotencyKey: item.idempotencyKey,
              method: "POST",
            },
          );
    case "event_interest":
      return payload.viewerInterested
        ? fphgoFetch(
            `/v1/events/${encodeURIComponent(stringValue(payload, "eventId"))}/interest`,
            {
              auth: "required",
              authToken,
              idempotencyKey: item.idempotencyKey,
              method: "DELETE",
            },
          )
        : fphgoFetch(
            `/v1/events/${encodeURIComponent(stringValue(payload, "eventId"))}/interest`,
            {
              auth: "required",
              authToken,
              idempotencyKey: item.idempotencyKey,
              method: "PUT",
            },
          );
  }
};

export const runSyncOutbox = async (authToken: string): Promise<SyncResult> => {
  const items = await listOutboxItems(["pending", "failed"]);
  const result: SyncResult = { failed: 0, synced: 0 };

  for (const item of items) {
    try {
      await markOutboxSyncing(item.id);
      await executeOutboxItem(item, authToken);
      await markOutboxSynced(item.id);
      result.synced += 1;
    } catch (error) {
      await markOutboxFailed(item.id, error);
      result.failed += 1;
      break;
    }
  }

  return result;
};

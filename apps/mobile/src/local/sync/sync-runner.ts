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
    case "chika_thread_create":
      return fphgoFetch("/v1/chika/threads", {
        auth: "required",
        authToken,
        body: {
          categoryId: stringValue(payload, "categoryId"),
          content: stringValue(payload, "content"),
          title: stringValue(payload, "title"),
        },
        idempotencyKey: item.idempotencyKey,
        method: "POST",
      });
    case "chika_comment_create":
      return fphgoFetch(
        `/v1/chika/threads/${encodeURIComponent(stringValue(payload, "threadId"))}/comments`,
        {
          auth: "required",
          authToken,
          body: {
          content: stringValue(payload, "content"),
          parentCommentId: optionalString(payload, "parentCommentId"),
        },
          idempotencyKey: item.idempotencyKey,
          method: "POST",
        },
      );
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
    case "profile_edit_update":
      return fphgoFetch("/v1/me/profile", {
        auth: "required",
        authToken,
        body: payload,
        idempotencyKey: item.idempotencyKey,
        method: "PATCH",
      });
    case "buddy_intent_create":
      return fphgoFetch("/v1/buddy-finder/intents", {
        auth: "required",
        authToken,
        body: {
          area: optionalString(payload, "area"),
          dateEnd: optionalString(payload, "dateEnd"),
          dateStart: optionalString(payload, "dateStart"),
          diveSiteId: optionalString(payload, "diveSiteId"),
          intentType: stringValue(payload, "intentType") as never,
          note: optionalString(payload, "note"),
          timeWindow: stringValue(payload, "timeWindow") as never,
        },
        idempotencyKey: item.idempotencyKey,
        method: "POST",
      });
    case "event_post_create":
      return fphgoFetch(
        `/v1/events/${encodeURIComponent(stringValue(payload, "eventId"))}/posts`,
        {
          auth: "required",
          authToken,
          body: {
            bodyMarkdown: stringValue(payload, "bodyMarkdown"),
            postType: "general",
          },
          idempotencyKey: item.idempotencyKey,
          method: "POST",
        },
      );
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
    case "group_post_create":
      return fphgoFetch(
        `/v1/groups/${encodeURIComponent(stringValue(payload, "groupId"))}/posts`,
        {
          auth: "required",
          authToken,
          body: {
          content: stringValue(payload, "content"),
          title: optionalString(payload, "title"),
        },
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

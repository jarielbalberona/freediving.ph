import {
  decodePayload,
  encodePayload,
  makeIdempotencyKey,
  makeLocalId,
  nowIso,
  type SyncEntityType,
  type SyncOperationType,
  type SyncOutboxRecord,
  type SyncOutboxStatus,
} from "@/local/db/types";
import { assertQueueablePayload } from "@/local/outbox/supported-operations";

type StoredOutboxItem = {
  id: string;
  operationType: SyncOperationType;
  entityType: SyncEntityType;
  entityId?: string;
  idempotencyKey: string;
  payloadJson: string;
  status: SyncOutboxStatus;
  attemptCount: number;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
  syncedAt?: string;
};

const outbox = new Map<string, StoredOutboxItem>();

const toOutboxRecord = <TPayload = Record<string, unknown>>(
  item: StoredOutboxItem,
): SyncOutboxRecord<TPayload> => ({
  attemptCount: item.attemptCount,
  createdAt: item.createdAt,
  entityId: item.entityId,
  entityType: item.entityType,
  id: item.id,
  idempotencyKey: item.idempotencyKey,
  lastError: item.lastError,
  operationType: item.operationType,
  payload: decodePayload<TPayload>(item.payloadJson),
  status: item.status,
  syncedAt: item.syncedAt,
  updatedAt: item.updatedAt,
});

export const createOutboxItem = async <TPayload extends Record<string, unknown>>(
  input: {
    operationType: SyncOperationType;
    entityType: SyncEntityType;
    entityId?: string;
    payload: TPayload;
    idempotencyKey?: string;
  },
) => {
  assertQueueablePayload(input.operationType, input.payload);

  const now = nowIso();
  const id = makeLocalId(input.operationType);
  const idempotencyKey =
    input.idempotencyKey ?? makeIdempotencyKey(input.operationType, id);

  const item: StoredOutboxItem = {
    id,
    operationType: input.operationType,
    entityType: input.entityType,
    entityId: input.entityId,
    idempotencyKey,
    payloadJson: encodePayload(input.payload),
    status: "pending",
    attemptCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  outbox.set(id, item);
  return getOutboxItem<TPayload>(id);
};

export const getOutboxItem = async <TPayload = Record<string, unknown>>(
  id: string,
) => {
  const item = outbox.get(id);
  return item ? toOutboxRecord<TPayload>(item) : undefined;
};

export const listOutboxItems = async (
  statuses: SyncOutboxStatus[] = ["pending", "failed"],
) =>
  Array.from(outbox.values())
    .filter((item) => statuses.includes(item.status))
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
    .map(toOutboxRecord);

export const markOutboxSyncing = async (id: string) => {
  const item = outbox.get(id);
  if (!item || !["pending", "failed"].includes(item.status)) return;

  outbox.set(id, {
    ...item,
    status: "syncing",
    attemptCount: item.attemptCount + 1,
    updatedAt: nowIso(),
  });
};

export const markOutboxSynced = async (id: string) => {
  const item = outbox.get(id);
  if (!item) return;

  const now = nowIso();
  outbox.set(id, {
    ...item,
    status: "synced",
    lastError: undefined,
    updatedAt: now,
    syncedAt: now,
  });
};

export const markOutboxFailed = async (id: string, error: unknown) => {
  const item = outbox.get(id);
  if (!item) return;

  const message = error instanceof Error ? error.message : String(error);
  outbox.set(id, {
    ...item,
    status: "failed",
    lastError: message.slice(0, 500),
    updatedAt: nowIso(),
  });
};

export const discardOutboxItem = async (id: string) => {
  const item = outbox.get(id);
  if (!item || !["pending", "failed"].includes(item.status)) return;

  outbox.set(id, {
    ...item,
    status: "discarded",
    updatedAt: nowIso(),
  });
};

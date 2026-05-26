import { getLocalDatabase } from "@/local/db/database";
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

type SyncOutboxRow = {
  id: string;
  operation_type: SyncOperationType;
  entity_type: SyncEntityType;
  entity_id: string | null;
  idempotency_key: string;
  payload_json: string;
  status: SyncOutboxStatus;
  attempt_count: number;
  last_error: string | null;
  created_at: string;
  updated_at: string;
  synced_at: string | null;
};

const rowToOutbox = <TPayload = Record<string, unknown>>(
  row: SyncOutboxRow,
): SyncOutboxRecord<TPayload> => ({
  attemptCount: row.attempt_count,
  createdAt: row.created_at,
  entityId: row.entity_id ?? undefined,
  entityType: row.entity_type,
  id: row.id,
  idempotencyKey: row.idempotency_key,
  lastError: row.last_error ?? undefined,
  operationType: row.operation_type,
  payload: decodePayload<TPayload>(row.payload_json),
  status: row.status,
  syncedAt: row.synced_at ?? undefined,
  updatedAt: row.updated_at,
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
  const db = await getLocalDatabase();
  const now = nowIso();
  const id = makeLocalId(input.operationType);
  const idempotencyKey =
    input.idempotencyKey ?? makeIdempotencyKey(input.operationType, id);

  await db.runAsync(
    `
      INSERT INTO sync_outbox
        (id, operation_type, entity_type, entity_id, idempotency_key, payload_json,
         status, attempt_count, last_error, created_at, updated_at, synced_at)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', 0, NULL, ?, ?, NULL)
    `,
    [
      id,
      input.operationType,
      input.entityType,
      input.entityId ?? null,
      idempotencyKey,
      encodePayload(input.payload),
      now,
      now,
    ],
  );

  return getOutboxItem<TPayload>(id);
};

export const getOutboxItem = async <TPayload = Record<string, unknown>>(
  id: string,
) => {
  const db = await getLocalDatabase();
  const row = await db.getFirstAsync<SyncOutboxRow>(
    "SELECT * FROM sync_outbox WHERE id = ?",
    [id],
  );
  return row ? rowToOutbox<TPayload>(row) : undefined;
};

export const listOutboxItems = async (
  statuses: SyncOutboxStatus[] = ["pending", "failed"],
) => {
  const db = await getLocalDatabase();
  const placeholders = statuses.map(() => "?").join(",");
  const rows = await db.getAllAsync<SyncOutboxRow>(
    `
      SELECT * FROM sync_outbox
      WHERE status IN (${placeholders})
      ORDER BY created_at ASC
    `,
    statuses,
  );
  return rows.map(rowToOutbox);
};

export const markOutboxSyncing = async (id: string) => {
  const db = await getLocalDatabase();
  await db.runAsync(
    `
      UPDATE sync_outbox
      SET status = 'syncing', attempt_count = attempt_count + 1, updated_at = ?
      WHERE id = ? AND status IN ('pending', 'failed')
    `,
    [nowIso(), id],
  );
};

export const markOutboxSynced = async (id: string) => {
  const db = await getLocalDatabase();
  const now = nowIso();
  await db.runAsync(
    `
      UPDATE sync_outbox
      SET status = 'synced', last_error = NULL, updated_at = ?, synced_at = ?
      WHERE id = ?
    `,
    [now, now, id],
  );
};

export const markOutboxFailed = async (id: string, error: unknown) => {
  const db = await getLocalDatabase();
  const message = error instanceof Error ? error.message : String(error);
  await db.runAsync(
    `
      UPDATE sync_outbox
      SET status = 'failed', last_error = ?, updated_at = ?
      WHERE id = ?
    `,
    [message.slice(0, 500), nowIso(), id],
  );
};

export const discardOutboxItem = async (id: string) => {
  const db = await getLocalDatabase();
  await db.runAsync(
    `
      UPDATE sync_outbox
      SET status = 'discarded', updated_at = ?
      WHERE id = ? AND status IN ('pending', 'failed')
    `,
    [nowIso(), id],
  );
};

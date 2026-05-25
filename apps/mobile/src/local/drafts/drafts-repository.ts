import { getLocalDatabase } from "@/local/db/database";
import {
  decodePayload,
  encodePayload,
  type LocalDraftRecord,
  type LocalDraftStatus,
  type LocalDraftType,
  makeLocalId,
  nowIso,
} from "@/local/db/types";

type LocalDraftRow = {
  id: string;
  type: LocalDraftType;
  payload_json: string;
  status: LocalDraftStatus;
  created_at: string;
  updated_at: string;
};

const rowToDraft = <TPayload = Record<string, unknown>>(
  row: LocalDraftRow,
): LocalDraftRecord<TPayload> => ({
  id: row.id,
  type: row.type,
  payload: decodePayload<TPayload>(row.payload_json),
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const saveLocalDraft = async <TPayload extends Record<string, unknown>>(
  input: {
    id?: string;
    type: LocalDraftType;
    payload: TPayload;
  },
) => {
  const db = await getLocalDatabase();
  const now = nowIso();
  const id = input.id ?? makeLocalId(input.type);
  const existing = input.id
    ? await getLocalDraft<TPayload>(input.id)
    : undefined;

  await db.runAsync(
    `
      INSERT OR REPLACE INTO local_drafts
        (id, type, payload_json, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      id,
      input.type,
      encodePayload(input.payload),
      "draft",
      existing?.createdAt ?? now,
      now,
    ],
  );

  return getLocalDraft<TPayload>(id);
};

export const getLocalDraft = async <TPayload = Record<string, unknown>>(
  id: string,
) => {
  const db = await getLocalDatabase();
  const row = await db.getFirstAsync<LocalDraftRow>(
    "SELECT * FROM local_drafts WHERE id = ? AND status != 'discarded'",
    [id],
  );
  return row ? rowToDraft<TPayload>(row) : undefined;
};

export const getLatestLocalDraft = async <TPayload = Record<string, unknown>>(
  type: LocalDraftType,
) => {
  const db = await getLocalDatabase();
  const row = await db.getFirstAsync<LocalDraftRow>(
    `
      SELECT * FROM local_drafts
      WHERE type = ? AND status = 'draft'
      ORDER BY updated_at DESC
      LIMIT 1
    `,
    [type],
  );
  return row ? rowToDraft<TPayload>(row) : undefined;
};

export const listLocalDrafts = async (type?: LocalDraftType) => {
  const db = await getLocalDatabase();
  const rows = await db.getAllAsync<LocalDraftRow>(
    type
      ? "SELECT * FROM local_drafts WHERE type = ? AND status = 'draft' ORDER BY updated_at DESC"
      : "SELECT * FROM local_drafts WHERE status = 'draft' ORDER BY updated_at DESC",
    type ? [type] : [],
  );
  return rows.map(rowToDraft);
};

export const markLocalDraftStatus = async (
  id: string,
  status: LocalDraftStatus,
) => {
  const db = await getLocalDatabase();
  await db.runAsync(
    "UPDATE local_drafts SET status = ?, updated_at = ? WHERE id = ?",
    [status, nowIso(), id],
  );
};

export const discardLocalDraft = async (id: string) => {
  await markLocalDraftStatus(id, "discarded");
};

export const clearSubmittedLocalDraft = async (id: string) => {
  const db = await getLocalDatabase();
  await db.runAsync("DELETE FROM local_drafts WHERE id = ?", [id]);
};

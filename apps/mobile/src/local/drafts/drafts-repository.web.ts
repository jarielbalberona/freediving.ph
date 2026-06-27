import {
  decodePayload,
  encodePayload,
  type LocalDraftRecord,
  type LocalDraftStatus,
  type LocalDraftType,
  makeLocalId,
  nowIso,
} from "@/local/db/types";

type StoredLocalDraft = {
  id: string;
  type: LocalDraftType;
  payloadJson: string;
  status: LocalDraftStatus;
  createdAt: string;
  updatedAt: string;
};

const drafts = new Map<string, StoredLocalDraft>();

const toDraft = <TPayload = Record<string, unknown>>(
  draft: StoredLocalDraft,
): LocalDraftRecord<TPayload> => ({
  id: draft.id,
  type: draft.type,
  payload: decodePayload<TPayload>(draft.payloadJson),
  status: draft.status,
  createdAt: draft.createdAt,
  updatedAt: draft.updatedAt,
});

export const saveLocalDraft = async <TPayload extends Record<string, unknown>>(
  input: {
    id?: string;
    type: LocalDraftType;
    payload: TPayload;
  },
) => {
  const now = nowIso();
  const id = input.id ?? makeLocalId(input.type);
  const existing = input.id ? drafts.get(input.id) : undefined;

  drafts.set(id, {
    id,
    type: input.type,
    payloadJson: encodePayload(input.payload),
    status: "draft",
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  });

  return getLocalDraft<TPayload>(id);
};

export const getLocalDraft = async <TPayload = Record<string, unknown>>(
  id: string,
) => {
  const draft = drafts.get(id);
  return draft && draft.status !== "discarded" ? toDraft<TPayload>(draft) : undefined;
};

export const getLatestLocalDraft = async <TPayload = Record<string, unknown>>(
  type: LocalDraftType,
) => {
  const latest = Array.from(drafts.values())
    .filter((draft) => draft.type === type && draft.status === "draft")
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];

  return latest ? toDraft<TPayload>(latest) : undefined;
};

export const listLocalDrafts = async (type?: LocalDraftType) =>
  Array.from(drafts.values())
    .filter(
      (draft) =>
        draft.status === "draft" && (type === undefined || draft.type === type),
    )
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .map(toDraft);

export const markLocalDraftStatus = async (
  id: string,
  status: LocalDraftStatus,
) => {
  const draft = drafts.get(id);
  if (!draft) return;

  drafts.set(id, {
    ...draft,
    status,
    updatedAt: nowIso(),
  });
};

export const discardLocalDraft = async (id: string) => {
  await markLocalDraftStatus(id, "discarded");
};

export const clearSubmittedLocalDraft = async (id: string) => {
  drafts.delete(id);
};

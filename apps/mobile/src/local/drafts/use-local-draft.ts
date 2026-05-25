import { useCallback, useEffect, useState } from "react";

import {
  clearSubmittedLocalDraft,
  discardLocalDraft,
  getLatestLocalDraft,
  saveLocalDraft,
} from "@/local/drafts/drafts-repository";
import type { LocalDraftRecord, LocalDraftType } from "@/local/db/types";

export type DraftUiStatus =
  | "idle"
  | "loaded"
  | "saved"
  | "discarded"
  | "submitted"
  | "unavailable";

export const useLocalDraft = <TPayload extends Record<string, unknown>>(
  type: LocalDraftType,
) => {
  const [draft, setDraft] = useState<LocalDraftRecord<TPayload> | undefined>();
  const [status, setStatus] = useState<DraftUiStatus>("idle");
  const [error, setError] = useState<string | undefined>();

  const load = useCallback(async () => {
    try {
      const latest = await getLatestLocalDraft<TPayload>(type);
      setDraft(latest);
      setStatus(latest ? "loaded" : "idle");
      setError(undefined);
      return latest;
    } catch {
      setStatus("unavailable");
      setError("Drafts are unavailable on this device.");
      return undefined;
    }
  }, [type]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(
    async (payload: TPayload) => {
      try {
        const saved = await saveLocalDraft<TPayload>({
          id: draft?.id,
          payload,
          type,
        });
        setDraft(saved);
        setStatus("saved");
        setError(undefined);
        return saved;
      } catch {
        setStatus("unavailable");
        setError("Could not save draft on this device.");
        return undefined;
      }
    },
    [draft?.id, type],
  );

  const discard = useCallback(async () => {
    if (!draft?.id) return;
    await discardLocalDraft(draft.id);
    setDraft(undefined);
    setStatus("discarded");
  }, [draft?.id]);

  const clearSubmitted = useCallback(async () => {
    if (!draft?.id) return;
    await clearSubmittedLocalDraft(draft.id);
    setDraft(undefined);
    setStatus("submitted");
  }, [draft?.id]);

  return {
    clearSubmitted,
    discard,
    draft,
    error,
    load,
    save,
    status,
  };
};

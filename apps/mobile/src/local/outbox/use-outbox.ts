import { useAuth } from "@clerk/expo";
import { useCallback, useEffect, useState } from "react";

import {
  createOutboxItem,
  discardOutboxItem,
  listOutboxItems,
} from "@/local/outbox/outbox-repository";
import { assertQueueableOperation } from "@/local/outbox/supported-operations";
import { runSyncOutbox } from "@/local/sync/sync-runner";
import type {
  SyncEntityType,
  SyncOperationType,
  SyncOutboxRecord,
} from "@/local/db/types";

export const useOutbox = () => {
  const { getToken, isSignedIn } = useAuth();
  const [items, setItems] = useState<SyncOutboxRecord[]>([]);
  const [message, setMessage] = useState<string | undefined>();
  const [isSyncing, setIsSyncing] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setItems(await listOutboxItems(["pending", "failed"]));
    } catch {
      setMessage("Pending sync is unavailable on this device.");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const enqueue = useCallback(
    async (input: {
      operationType: SyncOperationType;
      entityType: SyncEntityType;
      entityId?: string;
      payload: Record<string, unknown>;
    }) => {
      assertQueueableOperation(input.operationType);
      const item = await createOutboxItem(input);
      await refresh();
      setMessage("Waiting to sync");
      return item;
    },
    [refresh],
  );

  const syncNow = useCallback(async () => {
    const token = await getToken();
    if (!isSignedIn || !token) {
      setMessage("Sign in to sync pending changes.");
      return;
    }
    setIsSyncing(true);
    try {
      const result = await runSyncOutbox(token);
      await refresh();
      setMessage(
        result.failed > 0
          ? "Could not sync. Try again."
          : result.synced > 0
            ? "Synced"
            : undefined,
      );
    } finally {
      setIsSyncing(false);
    }
  }, [getToken, isSignedIn, refresh]);

  const discard = useCallback(
    async (id: string) => {
      await discardOutboxItem(id);
      await refresh();
      setMessage("Pending item discarded");
    },
    [refresh],
  );

  return {
    discard,
    enqueue,
    isSyncing,
    items,
    message,
    refresh,
    syncNow,
  };
};

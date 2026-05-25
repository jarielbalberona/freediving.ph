import { Text, View } from "react-native";

import { MobileButton } from "@/components/ui/mobile-button";
import type { SyncOutboxRecord } from "@/local/db/types";

type PendingSyncPanelProps = {
  isSyncing: boolean;
  items: SyncOutboxRecord[];
  message?: string;
  onDiscard?: (id: string) => void;
  onSyncNow: () => void;
};

const labelForItem = (item: SyncOutboxRecord) => {
  if (item.status === "failed") return "Could not sync. Try again.";
  return "Waiting to sync";
};

export function PendingSyncPanel({
  isSyncing,
  items,
  message,
  onDiscard,
  onSyncNow,
}: PendingSyncPanelProps) {
  if (items.length === 0 && !message) return null;

  return (
    <View className="gap-3 rounded-2xl border border-border bg-card p-4">
      <Text className="text-sm font-semibold text-foreground">Drafts and pending changes</Text>
      {message ? (
        <Text className="text-sm leading-6 text-muted-foreground">{message}</Text>
      ) : null}
      {items.slice(0, 3).map((item) => (
        <View key={item.id} className="gap-2 rounded-xl bg-secondary p-3">
          <Text className="text-sm font-medium text-secondary-foreground">
            {labelForItem(item)}
          </Text>
          {item.lastError ? (
            <Text className="text-xs text-muted-foreground">{item.lastError}</Text>
          ) : null}
          {item.status === "failed" && onDiscard ? (
            <MobileButton variant="ghost" onPress={() => onDiscard(item.id)}>
              Discard
            </MobileButton>
          ) : null}
        </View>
      ))}
      <MobileButton disabled={isSyncing || items.length === 0} onPress={onSyncNow}>
        {isSyncing ? "Syncing" : "Try sync now"}
      </MobileButton>
    </View>
  );
}

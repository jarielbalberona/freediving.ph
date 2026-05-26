import { View } from "react-native";

import {
  MobileScrollScreen,
  MobileSection,
} from "@/components/shell";
import { MediaComposerSheet } from "@/features/media/components/media-composer-sheet";
import { useLocalDraft } from "@/local/drafts/use-local-draft";
import { useOutbox } from "@/local/outbox/use-outbox";
import { PendingSyncPanel } from "@/local/sync/pending-sync-panel";

export function CreateScreen() {
  const postComposerDraft = useLocalDraft<{ kind: string }>("post_composer");
  const outbox = useOutbox();

  return (
    <MobileScrollScreen subtitle="Create" title="Post">
      <MobileSection
        description="Share photos or moments from dives, training days, and community events."
        title="Photos and moments"
      >
        <View className="gap-3">
          <PendingSyncPanel
            isSyncing={outbox.isSyncing}
            items={outbox.items}
            message={
              postComposerDraft.status === "saved" ? "Saved as draft" : outbox.message
            }
            onDiscard={outbox.discard}
            onSyncNow={outbox.syncNow}
          />
        </View>
      </MobileSection>

      <MobileSection title="Share media">
        <MediaComposerSheet onClose={() => undefined} />
      </MobileSection>
    </MobileScrollScreen>
  );
}

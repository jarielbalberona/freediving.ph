import { useEffect, useState } from "react";
import { Text, TextInput, View } from "react-native";

import {
  MobileEmptyState,
  MobileErrorState,
  MobileLoadingState,
  MobileScrollScreen,
  MobileSection,
} from "@/components/shell";
import { MobileButton } from "@/components/ui/mobile-button";
import { BuddyIntentCard } from "@/features/buddies/components/buddy-intent-card";
import {
  useBuddyMessageEntryMutation,
  useCreateBuddyIntentMutation,
  useDeleteBuddyIntentMutation,
} from "@/features/buddies/hooks/use-buddy-mutations";
import {
  useBuddyFinderQuery,
  useMemberBuddyFinderIntentsQuery,
  useMyBuddyFinderIntentsQuery,
} from "@/features/buddies/hooks/use-buddy-finder-query";
import { useLocalDraft } from "@/local/drafts/use-local-draft";
import { useOutbox } from "@/local/outbox/use-outbox";
import { PendingSyncPanel } from "@/local/sync/pending-sync-panel";

export function BuddiesScreen() {
  const buddiesQuery = useBuddyFinderQuery();
  const memberIntentsQuery = useMemberBuddyFinderIntentsQuery();
  const myIntentsQuery = useMyBuddyFinderIntentsQuery();
  const createIntent = useCreateBuddyIntentMutation();
  const deleteIntent = useDeleteBuddyIntentMutation();
  const messageEntry = useBuddyMessageEntryMutation();
  const buddyDraft = useLocalDraft<{ area: string; note?: string }>("buddy_intent");
  const outbox = useOutbox();
  const [area, setArea] = useState("");
  const [note, setNote] = useState("");
  const intents = memberIntentsQuery.data?.items ?? buddiesQuery.data?.items ?? [];
  const myIntents = myIntentsQuery.data?.items ?? [];

  useEffect(() => {
    if (!buddyDraft.draft) return;
    setArea(buddyDraft.draft.payload.area);
    setNote(buddyDraft.draft.payload.note ?? "");
  }, [buddyDraft.draft]);

  return (
    <MobileScrollScreen subtitle="Buddy Finder" title="Buddies">
      <MobileSection
        description="Create a lightweight intent so other members know where and when you want to dive."
        title="Your buddy intent"
      >
        <View className="gap-3">
          <PendingSyncPanel
            isSyncing={outbox.isSyncing}
            items={outbox.items}
            message={buddyDraft.status === "saved" ? "Saved as draft" : outbox.message}
            onDiscard={outbox.discard}
            onSyncNow={outbox.syncNow}
          />
          <TextInput
            className="rounded-2xl border border-border bg-card p-3 text-foreground"
            onChangeText={setArea}
            placeholder="Area, e.g. Mabini, Batangas"
            placeholderTextColor="#64748b"
            value={area}
          />
          <TextInput
            className="min-h-20 rounded-2xl border border-border bg-card p-3 text-foreground"
            multiline
            onChangeText={setNote}
            placeholder="Short note"
            placeholderTextColor="#64748b"
            value={note}
          />
          <MobileButton
            variant="secondary"
            onPress={() =>
              void buddyDraft.save({
                area: area.trim(),
                note: note.trim() || undefined,
              })
            }
          >
            Save as draft
          </MobileButton>
          <MobileButton
            disabled={createIntent.isPending || area.trim().length < 2}
            onPress={() => {
              createIntent.mutate(
                {
                  area: area.trim(),
                  intentType: "fun_dive",
                  note: note.trim() || undefined,
                  timeWindow: "weekend",
                },
                {
                  onError: () => {
                    void buddyDraft.save({
                      area: area.trim(),
                      note: note.trim() || undefined,
                    });
                    void outbox.enqueue({
                      entityType: "buddy_intent",
                      operationType: "buddy_intent_create",
                      payload: {
                        area: area.trim(),
                        intentType: "fun_dive",
                        note: note.trim() || undefined,
                        timeWindow: "weekend",
                      },
                    });
                  },
                  onSuccess: () => {
                    void buddyDraft.clearSubmitted();
                    setArea("");
                    setNote("");
                  },
                },
              );
            }}
          >
            Create weekend intent
          </MobileButton>
          {myIntents.length > 0 ? (
            <View className="gap-2">
              {myIntents.map((intent) => (
                <View
                  key={intent.id}
                  className="rounded-2xl border border-border bg-card p-4"
                >
                  <Text className="text-sm font-semibold text-foreground">
                    {intent.area}
                  </Text>
                  <Text className="mt-1 text-xs text-muted-foreground">
                    {intent.intentType} · {intent.timeWindow}
                  </Text>
                  <View className="mt-3">
                    <MobileButton
                      disabled={deleteIntent.isPending}
                      variant="danger"
                      onPress={() => deleteIntent.mutate(intent.id)}
                    >
                      Close intent
                    </MobileButton>
                  </View>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </MobileSection>

      <MobileSection
        description="Find divers who have shared where and when they want to dive."
        title="Looking for a dive buddy"
      >
        {buddiesQuery.isLoading || memberIntentsQuery.isLoading ? (
          <MobileLoadingState message="Loading buddy posts." />
        ) : null}

        {buddiesQuery.error && !memberIntentsQuery.data ? (
          <View className="gap-3">
            <MobileErrorState
              message="Buddy posts are taking longer than expected to load."
              title="Buddy Finder unavailable"
            />
            <MobileButton variant="secondary" onPress={() => void buddiesQuery.refetch()}>
              Try again
            </MobileButton>
          </View>
        ) : null}

        {!buddiesQuery.isLoading && !memberIntentsQuery.isLoading && !buddiesQuery.error && intents.length === 0 ? (
          <MobileEmptyState
            description="No buddy posts yet. Check back as divers share where and when they want to dive."
            title="No buddy posts yet"
          />
        ) : null}

        {!buddiesQuery.isLoading && !memberIntentsQuery.isLoading && !buddiesQuery.error && intents.length > 0 ? (
          <View className="gap-3">
            {intents.map((intent) => (
              <BuddyIntentCard
                intent={intent}
                key={intent.id}
                onMessage={
                  "authorAppUserId" in intent
                    ? () => messageEntry.mutate(intent.id)
                    : undefined
                }
              />
            ))}
          </View>
        ) : null}
      </MobileSection>
    </MobileScrollScreen>
  );
}

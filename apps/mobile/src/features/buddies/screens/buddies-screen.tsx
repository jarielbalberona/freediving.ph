import { useRouter } from "expo-router";
import type { Href } from "expo-router";
import { useEffect, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { useAuth } from "@clerk/expo";

import type { CreateBuddyFinderIntentRequest } from "@freediving.ph/types";

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
import {
  intentTypeLabel,
  safeBuddyUsername,
} from "@/features/buddies/lib/buddy-format";
import { useLocalDraft } from "@/local/drafts/use-local-draft";
import { useOutbox } from "@/local/outbox/use-outbox";
import { PendingSyncPanel } from "@/local/sync/pending-sync-panel";

type BuddyDraft = {
  area: string;
  dateEnd?: string;
  dateStart?: string;
  intentType: CreateBuddyFinderIntentRequest["intentType"];
  note?: string;
  timeWindow: CreateBuddyFinderIntentRequest["timeWindow"];
};

const intentTypeOptions: Array<CreateBuddyFinderIntentRequest["intentType"]> = [
  "fun_dive",
  "training",
  "line_training",
  "depth",
  "pool",
];

const timeWindowOptions: Array<CreateBuddyFinderIntentRequest["timeWindow"]> = [
  "today",
  "weekend",
  "specific_date",
];

const timeWindowOptionLabel = (
  value: CreateBuddyFinderIntentRequest["timeWindow"],
) => {
  if (value === "today") return "Today";
  if (value === "weekend") return "This weekend";
  return "Specific date";
};

const profileHrefForUsername = (username: string | undefined) => {
  const safeUsername = safeBuddyUsername(username);
  if (!safeUsername) return undefined;
  return {
    pathname: "/(app)/(tabs)/(home)/profile/[username]",
    params: { username: safeUsername },
  } as Href;
};

const buddyDraftPayload = (draft: BuddyDraft): CreateBuddyFinderIntentRequest => ({
  area: draft.area.trim(),
  dateEnd:
    draft.timeWindow === "specific_date" ? draft.dateEnd?.trim() || undefined : undefined,
  dateStart:
    draft.timeWindow === "specific_date"
      ? draft.dateStart?.trim() || undefined
      : undefined,
  intentType: draft.intentType,
  note: draft.note?.trim() || undefined,
  timeWindow: draft.timeWindow,
});

export function BuddiesScreen() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const buddiesQuery = useBuddyFinderQuery();
  const memberIntentsQuery = useMemberBuddyFinderIntentsQuery();
  const myIntentsQuery = useMyBuddyFinderIntentsQuery();
  const createIntent = useCreateBuddyIntentMutation();
  const deleteIntent = useDeleteBuddyIntentMutation();
  const messageEntry = useBuddyMessageEntryMutation();
  const buddyDraft = useLocalDraft<BuddyDraft>("buddy_intent");
  const outbox = useOutbox();
  const [area, setArea] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [intentType, setIntentType] =
    useState<CreateBuddyFinderIntentRequest["intentType"]>("fun_dive");
  const [messageError, setMessageError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [timeWindow, setTimeWindow] =
    useState<CreateBuddyFinderIntentRequest["timeWindow"]>("weekend");
  const canUseMemberBuddies = isLoaded && Boolean(isSignedIn);
  const intents = canUseMemberBuddies
    ? (memberIntentsQuery.data?.items ?? [])
    : (buddiesQuery.data?.items ?? []);
  const isListLoading =
    buddiesQuery.isLoading ||
    (canUseMemberBuddies && memberIntentsQuery.isLoading);
  const listError = canUseMemberBuddies
    ? memberIntentsQuery.error
    : buddiesQuery.error;
  const myIntents = canUseMemberBuddies ? (myIntentsQuery.data?.items ?? []) : [];
  const myIntentIds = new Set(myIntents.map((intent) => intent.id));

  useEffect(() => {
    if (!buddyDraft.draft) return;
    setArea(buddyDraft.draft.payload.area);
    setDateEnd(buddyDraft.draft.payload.dateEnd ?? "");
    setDateStart(buddyDraft.draft.payload.dateStart ?? "");
    setIntentType(buddyDraft.draft.payload.intentType ?? "fun_dive");
    setNote(buddyDraft.draft.payload.note ?? "");
    setTimeWindow(buddyDraft.draft.payload.timeWindow ?? "weekend");
  }, [buddyDraft.draft]);

  const draft: BuddyDraft = {
    area,
    dateEnd: dateEnd || undefined,
    dateStart: dateStart || undefined,
    intentType,
    note: note || undefined,
    timeWindow,
  };
  const createPayload = buddyDraftPayload(draft);
  const canCreate =
    area.trim().length >= 2 &&
    (timeWindow !== "specific_date" || dateStart.trim().length > 0);

  return (
    <MobileScrollScreen subtitle="Buddy Finder" title="Buddies">
      {canUseMemberBuddies ? (
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
          <View className="gap-2">
            <Text className="text-sm font-semibold text-foreground">Dive type</Text>
            <View className="flex-row flex-wrap gap-2">
              {intentTypeOptions.map((option) => (
                <MobileButton
                  key={option}
                  variant={option === intentType ? "primary" : "secondary"}
                  onPress={() => setIntentType(option)}
                >
                  {intentTypeLabel(option)}
                </MobileButton>
              ))}
            </View>
          </View>
          <View className="gap-2">
            <Text className="text-sm font-semibold text-foreground">When</Text>
            <View className="flex-row flex-wrap gap-2">
              {timeWindowOptions.map((option) => (
                <MobileButton
                  key={option}
                  variant={option === timeWindow ? "primary" : "secondary"}
                  onPress={() => setTimeWindow(option)}
                >
                  {timeWindowOptionLabel(option)}
                </MobileButton>
              ))}
            </View>
          </View>
          {timeWindow === "specific_date" ? (
            <View className="gap-2">
              <TextInput
                className="rounded-2xl border border-border bg-card p-3 text-foreground"
                onChangeText={setDateStart}
                placeholder="Start date, YYYY-MM-DD"
                placeholderTextColor="#64748b"
                value={dateStart}
              />
              <TextInput
                className="rounded-2xl border border-border bg-card p-3 text-foreground"
                onChangeText={setDateEnd}
                placeholder="End date, optional"
                placeholderTextColor="#64748b"
                value={dateEnd}
              />
            </View>
          ) : null}
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
              void buddyDraft.save(draft).then(() => {
                setFormMessage("Saved as draft");
              })
            }
          >
            Save as draft
          </MobileButton>
          {buddyDraft.draft ? (
            <MobileButton
              variant="ghost"
              onPress={() =>
                void buddyDraft.discard().then(() => {
                  setArea("");
                  setDateEnd("");
                  setDateStart("");
                  setFormMessage("Draft discarded.");
                  setIntentType("fun_dive");
                  setNote("");
                  setTimeWindow("weekend");
                })
              }
            >
              Discard draft
            </MobileButton>
          ) : null}
          <MobileButton
            disabled={createIntent.isPending || !canCreate}
            onPress={() => {
              setFormMessage(null);
              createIntent.mutate(createPayload, {
                onError: () => {
                  setFormMessage("Could not post this yet. Saved as draft.");
                  void buddyDraft.save(draft);
                },
                onSuccess: () => {
                  void buddyDraft.clearSubmitted();
                  setArea("");
                  setDateEnd("");
                  setDateStart("");
                  setFormMessage("Buddy intent posted.");
                  setIntentType("fun_dive");
                  setNote("");
                  setTimeWindow("weekend");
                },
              });
            }}
          >
            Create intent
          </MobileButton>
          {formMessage ? (
            <Text className="text-sm text-muted-foreground">{formMessage}</Text>
          ) : null}
          {myIntents.length > 0 ? (
            <View className="gap-3">
              {myIntents.map((intent) => (
                <BuddyIntentCard
                  intent={intent}
                  isClosePending={deleteIntent.isPending}
                  key={intent.id}
                  showEditDeferred
                  onClose={() =>
                    deleteIntent.mutate(intent.id, {
                      onError: () =>
                        setFormMessage("Could not close this intent. Try again."),
                      onSuccess: () => setFormMessage("Buddy intent closed."),
                    })
                  }
                />
              ))}
            </View>
          ) : null}
          </View>
        </MobileSection>
      ) : (
        <MobileSection
          description="Preview public buddy posts. Sign in to post your own buddy request and message other divers."
          title="Find a dive buddy"
        >
          {!isLoaded ? (
            <MobileLoadingState message="Checking your session." />
          ) : (
            <Text className="text-sm leading-6 text-muted-foreground">
              Sign in to post a buddy request.
            </Text>
          )}
        </MobileSection>
      )}

      <MobileSection
        description="Find divers who have shared where and when they want to dive."
        title="Looking for a dive buddy"
      >
        {isListLoading ? (
          <MobileLoadingState message="Loading buddy posts." />
        ) : null}

        {listError ? (
          <View className="gap-3">
            <MobileErrorState
              message="Buddy posts are taking longer than expected to load."
              title="Buddy Finder unavailable"
            />
            <MobileButton
              variant="secondary"
              onPress={() =>
                void (canUseMemberBuddies
                  ? memberIntentsQuery.refetch()
                  : buddiesQuery.refetch())
              }
            >
              Try again
            </MobileButton>
          </View>
        ) : null}

        {!isListLoading &&
        !listError &&
        intents.length === 0 ? (
          <MobileEmptyState
            description="No buddy posts yet. Check back as divers share where and when they want to dive."
            title="No buddy posts yet"
          />
        ) : null}

        {!isListLoading &&
        !listError &&
        intents.length > 0 ? (
          <View className="gap-3">
            {intents.map((intent) => (
              <BuddyIntentCard
                intent={intent}
                isMessagePending={messageEntry.isPending}
                key={intent.id}
                profileHref={
                  "username" in intent
                    ? profileHrefForUsername(intent.username)
                    : undefined
                }
                onMessage={
                  canUseMemberBuddies &&
                  "authorAppUserId" in intent &&
                  !myIntentIds.has(intent.id)
                    ? () => {
                        setMessageError(null);
                        messageEntry.mutate(intent.id, {
                          onError: () =>
                            setMessageError(
                              "Could not open messages for this buddy.",
                            ),
                          onSuccess: (thread) => {
                            router.push({
                              pathname: "/(app)/(tabs)/messages/[threadId]",
                              params: { threadId: thread.id },
                            } as Href);
                          },
                        });
                      }
                    : undefined
                }
              />
            ))}
            {messageError ? (
              <Text className="text-sm text-muted-foreground">{messageError}</Text>
            ) : null}
          </View>
        ) : null}
      </MobileSection>
    </MobileScrollScreen>
  );
}

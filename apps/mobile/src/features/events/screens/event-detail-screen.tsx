import { Image } from "expo-image";
import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { useAuth } from "@clerk/expo";

import {
  MobileEmptyState,
  MobileErrorState,
  MobileLoadingState,
  MobileScrollScreen,
  MobileSection,
} from "@/components/shell";
import { MobileButton } from "@/components/ui/mobile-button";
import { EventDetailRow } from "@/features/events/components/event-detail-row";
import { useEventDetailQuery } from "@/features/events/hooks/use-event-detail-query";
import {
  useCreateEventPostMutation,
  useEventAttendanceMutation,
  useEventInterestMutation,
  useEventPostFishMutation,
} from "@/features/events/hooks/use-event-mutations";
import { useEventPostsQuery } from "@/features/events/hooks/use-event-posts-query";
import {
  eventDifficultyLabel,
  eventLocationLabel,
  eventPriceLabel,
  eventSummary,
  eventTypeLabel,
  formatEventDate,
  safeImageUrl,
  stripMarkdownPreview,
  titleCase,
} from "@/features/events/lib/event-format";
import { useLocalDraft } from "@/local/drafts/use-local-draft";
import { useOutbox } from "@/local/outbox/use-outbox";
import { PendingSyncPanel } from "@/local/sync/pending-sync-panel";

const firstParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export function EventDetailScreen() {
  const params = useLocalSearchParams<{ slug?: string | string[] }>();
  const slug = firstParam(params.slug);
  const eventQuery = useEventDetailQuery(slug);
  const { isLoaded, isSignedIn } = useAuth();
  const event = eventQuery.data?.event;
  const eventPostsQuery = useEventPostsQuery(
    event?.id,
    Boolean(event?.postsEnabled && isLoaded && isSignedIn),
  );
  const attendanceMutation = useEventAttendanceMutation(slug ?? "", event?.id ?? "");
  const interestMutation = useEventInterestMutation(slug ?? "", event?.id ?? "");
  const createPostMutation = useCreateEventPostMutation(slug ?? "", event?.id ?? "");
  const fishMutation = useEventPostFishMutation(slug ?? "", event?.id ?? "");
  const [postBody, setPostBody] = useState("");
  const eventPostDraft = useLocalDraft<{ bodyMarkdown: string; eventId?: string }>(
    "event_post",
  );
  const outbox = useOutbox();
  const draftApplies = Boolean(
    event && eventPostDraft.draft?.payload.eventId === event.id,
  );

  useEffect(() => {
    if (!draftApplies || !eventPostDraft.draft) return;
    setPostBody(eventPostDraft.draft.payload.bodyMarkdown);
  }, [draftApplies, eventPostDraft.draft]);

  if (!slug) {
    return (
      <MobileScrollScreen subtitle="Event" title="Events">
        <MobileEmptyState
          description="Choose an event from the calendar to see its details."
          title="Event not found"
        />
      </MobileScrollScreen>
    );
  }

  if (eventQuery.isLoading) {
    return (
      <MobileScrollScreen subtitle="Event" title="Events">
        <MobileLoadingState message="Loading event." />
      </MobileScrollScreen>
    );
  }

  if (eventQuery.error) {
    return (
      <MobileScrollScreen subtitle="Event" title="Events">
        <View className="gap-3">
          <MobileErrorState
            message="This event is taking longer than expected to load."
            title="Event unavailable"
          />
          <MobileButton variant="secondary" onPress={() => void eventQuery.refetch()}>
            Try again
          </MobileButton>
        </View>
      </MobileScrollScreen>
    );
  }

  if (!event) {
    return (
      <MobileScrollScreen subtitle="Event" title="Events">
        <MobileEmptyState
          description="This event may have been removed or is not available yet."
          title="Event not found"
        />
      </MobileScrollScreen>
    );
  }

  const coverUrl = safeImageUrl(event.coverPhotoUrl);
  const body = stripMarkdownPreview(event.descriptionMarkdown || event.description);
  const showPaymentInstructions =
    event.visibility === "public" &&
    event.viewerCanViewPrivateDetails &&
    event.paymentMode !== "free" &&
    Boolean(event.paymentInstructions?.trim());
  const canPost =
    event.postsEnabled &&
    (event.postCreatePolicy === "participants"
      ? event.viewerJoined || event.viewerCanManage
      : event.viewerCanManage);
  const eventPosts = eventPostsQuery.data?.posts ?? [];

  return (
    <>
      <Stack.Screen options={{ title: event.title }} />
      <MobileScrollScreen subtitle={eventTypeLabel(event.type)} title="Events">
        <MobileSection description={eventSummary(event)} title={event.title}>
          <View className="gap-4">
            {coverUrl ? (
              <Image
                accessibilityLabel=""
                className="h-52 w-full rounded-2xl bg-secondary"
                contentFit="cover"
                source={{ uri: coverUrl }}
                transition={150}
              />
            ) : null}

            <View className="flex-row flex-wrap gap-2">
              <Text className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                {eventTypeLabel(event.type)}
              </Text>
              <Text className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                {eventDifficultyLabel(event.difficulty)}
              </Text>
              <Text className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                {eventPriceLabel(event)}
              </Text>
              {event.beginnerFriendly ? (
                <Text className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                  Beginner friendly
                </Text>
              ) : null}
            </View>

            {body ? (
              <Text className="text-sm leading-6 text-muted-foreground">{body}</Text>
            ) : null}
          </View>
        </MobileSection>

        <MobileSection title="Event details">
          <View className="gap-3">
            <EventDetailRow
              label="Schedule"
              value={formatEventDate(event.startsAt, event.endsAt, event.timezone)}
            />
            <EventDetailRow label="Location" value={eventLocationLabel(event)} />
            <EventDetailRow label="Meeting point" value={event.meetingPoint} />
            <EventDetailRow label="Confirmed" value={event.goingCount} />
            <EventDetailRow label="Interested" value={event.interestedCount} />
            <EventDetailRow
              label="Capacity"
              value={event.capacity ? `${event.capacity} divers` : undefined}
            />
          </View>
        </MobileSection>

        <MobileSection title="Dive information">
          <View className="gap-3">
            <EventDetailRow label="Type" value={eventTypeLabel(event.type)} />
            <EventDetailRow
              label="Difficulty"
              value={eventDifficultyLabel(event.difficulty)}
            />
            <EventDetailRow
              label="Maximum depth"
              value={event.maxDepthM ? `${event.maxDepthM}m` : undefined}
            />
            <EventDetailRow label="Entry" value={titleCase(event.entryType)} />
            <EventDetailRow label="Equipment notes" value={event.equipmentNotes} />
            <EventDetailRow label="Safety notes" value={event.safetyNotes} />
          </View>
        </MobileSection>

        <MobileSection title="Attendance">
          <View className="gap-3">
            <View className="flex-row gap-2">
              <View className="flex-1">
                <MobileButton
                  disabled={attendanceMutation.isPending || event.viewerJoined}
                  onPress={() => attendanceMutation.mutate("join")}
                >
                  {event.viewerJoined ? "Joined" : "Join"}
                </MobileButton>
              </View>
              {event.viewerJoined ? (
                <View className="flex-1">
                  <MobileButton
                    disabled={attendanceMutation.isPending}
                    variant="danger"
                    onPress={() => attendanceMutation.mutate("leave")}
                  >
                    Leave
                  </MobileButton>
                </View>
              ) : null}
            </View>
            {event.interestedEnabled ? (
              <MobileButton
                disabled={interestMutation.isPending}
                variant="secondary"
                onPress={() =>
                  interestMutation.mutate(!event.viewerInterested, {
                    onError: () =>
                      void outbox.enqueue({
                        entityId: event.id,
                        entityType: "event",
                        operationType: "event_interest",
                        payload: {
                          eventId: event.id,
                          viewerInterested: event.viewerInterested,
                        },
                      }),
                  })
                }
              >
                {event.viewerInterested ? "Remove interest" : "Interested"}
              </MobileButton>
            ) : null}
            <EventDetailRow
              label="Price"
              value={eventPriceLabel(event)}
            />
            <EventDetailRow
              label="Approval"
              value={event.requiresApproval ? "Approval required" : "No approval required"}
            />
            {showPaymentInstructions ? (
              <EventDetailRow
                label="Payment instructions"
                value={event.paymentInstructions}
              />
            ) : null}
            <EventDetailRow
              label="Cancellation"
              value={event.cancellationPolicy}
            />
          </View>
        </MobileSection>

        {event.postsEnabled ? (
          <MobileSection title="Event updates">
            <View className="gap-3">
              <PendingSyncPanel
                isSyncing={outbox.isSyncing}
                items={outbox.items}
                message={
                  eventPostDraft.status === "saved" && draftApplies
                    ? "Saved as draft"
                    : outbox.message
                }
                onDiscard={outbox.discard}
                onSyncNow={outbox.syncNow}
              />
              {canPost ? (
                <View className="gap-3">
                  <TextInput
                    className="min-h-24 rounded-2xl border border-border bg-card p-3 text-foreground"
                    multiline
                    onChangeText={setPostBody}
                    placeholder="Share an event update"
                    placeholderTextColor="#64748b"
                    value={postBody}
                  />
                  <MobileButton
                    variant="secondary"
                    onPress={() =>
                      void eventPostDraft.save({
                        bodyMarkdown: postBody,
                        eventId: event.id,
                      })
                    }
                  >
                    Save draft
                  </MobileButton>
                  <MobileButton
                    disabled={createPostMutation.isPending || postBody.trim().length === 0}
                    onPress={() => {
                      const body = postBody.trim();
                      if (!body) return;
                      createPostMutation.mutate(body, {
                        onError: () => {
                          void eventPostDraft.save({
                            bodyMarkdown: body,
                            eventId: event.id,
                          });
                          void outbox.enqueue({
                            entityId: event.id,
                            entityType: "event_post",
                            operationType: "event_post_create",
                            payload: {
                              bodyMarkdown: body,
                              eventId: event.id,
                            },
                          });
                        },
                        onSuccess: () => {
                          void eventPostDraft.clearSubmitted();
                          setPostBody("");
                        },
                      });
                    }}
                  >
                    Post update
                  </MobileButton>
                </View>
              ) : null}

              {eventPosts.length === 0 ? (
                <MobileEmptyState
                  description="Event updates will appear here when available."
                  title="No updates"
                />
              ) : null}

              {eventPosts.map((post) => (
                <View key={post.id} className="rounded-2xl border border-border bg-card p-4">
                  <Text className="text-sm font-semibold text-foreground">
                    {post.authorDisplayName || "Organizer"}
                  </Text>
                  {post.title ? (
                    <Text className="mt-2 text-base font-semibold text-foreground">
                      {post.title}
                    </Text>
                  ) : null}
                  <Text className="mt-2 text-sm leading-6 text-muted-foreground">
                    {stripMarkdownPreview(post.bodyMarkdown)}
                  </Text>
                  <View className="mt-3">
                    <MobileButton
                      disabled={fishMutation.isPending}
                      variant="secondary"
                      onPress={() =>
                        fishMutation.mutate(
                          {
                            hasFish: post.viewerHasFishReacted,
                            postId: post.id,
                          },
                          {
                            onError: () =>
                              void outbox.enqueue({
                                entityId: post.id,
                                entityType: "event_post",
                                operationType: "event_post_fish",
                                payload: {
                                  eventId: event.id,
                                  postId: post.id,
                                  viewerHasFishReacted: post.viewerHasFishReacted,
                                },
                              }),
                          },
                        )
                      }
                    >
                      {post.viewerHasFishReacted ? "Remove fish" : "Fish"} · {post.fishReactionCount}
                    </MobileButton>
                  </View>
                </View>
              ))}
            </View>
          </MobileSection>
        ) : null}
      </MobileScrollScreen>
    </>
  );
}

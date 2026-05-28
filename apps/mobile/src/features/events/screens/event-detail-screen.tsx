import { Image } from "expo-image";
import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { useAuth } from "@clerk/expo";

import { SocialActionRow, SocialMetadataLine, UserIdentityRow } from "@/components/social";
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
import { shouldQueueFailedMutation } from "@/local/outbox/supported-operations";
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
    Boolean(event?.postsEnabled),
  );
  const attendanceMutation = useEventAttendanceMutation(slug ?? "", event?.id ?? "");
  const interestMutation = useEventInterestMutation(slug ?? "", event?.id ?? "");
  const createPostMutation = useCreateEventPostMutation(slug ?? "", event?.id ?? "");
  const fishMutation = useEventPostFishMutation(slug ?? "", event?.id ?? "");
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [postTitle, setPostTitle] = useState("");
  const [postBody, setPostBody] = useState("");
  const [postMessage, setPostMessage] = useState<string | null>(null);
  const eventPostDraft = useLocalDraft<{
    bodyMarkdown: string;
    eventId?: string;
    title?: string;
  }>("event_post");
  const outbox = useOutbox();
  const draftApplies = Boolean(
    event && eventPostDraft.draft?.payload.eventId === event.id,
  );

  useEffect(() => {
    if (!draftApplies || !eventPostDraft.draft) return;
    setPostTitle(eventPostDraft.draft.payload.title ?? "");
    setPostBody(eventPostDraft.draft.payload.bodyMarkdown);
  }, [draftApplies, eventPostDraft.draft]);

  if (!slug) {
    return (
      <MobileScrollScreen subtitle="Event" title="Events">
        <Stack.Screen options={{ title: "Event unavailable" }} />
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
        <Stack.Screen options={{ title: "Events" }} />
        <MobileLoadingState message="Loading event." />
      </MobileScrollScreen>
    );
  }

  if (eventQuery.error) {
    return (
      <MobileScrollScreen subtitle="Event" title="Events">
        <Stack.Screen options={{ title: "Event unavailable" }} />
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
        <Stack.Screen options={{ title: "Event unavailable" }} />
        <MobileEmptyState
          description="This event may have been removed or is not available yet."
          title="Event not found"
        />
      </MobileScrollScreen>
    );
  }

  const coverUrl = safeImageUrl(event.coverPhotoUrl);
  const body = stripMarkdownPreview(event.descriptionMarkdown || event.description);
  const viewerState = event.viewerEventState ?? "none";
  const canUseInterest =
    event.visibility !== "private" ||
    event.viewerCanViewPrivateDetails ||
    event.viewerCanManage;
  const canToggleInterest =
    isLoaded &&
    Boolean(isSignedIn) &&
    event.interestedEnabled &&
    canUseInterest &&
    event.status === "published" &&
    ["none", "interested", "rejected", "left", "cancelled"].includes(
      viewerState,
    );
  const canJoin =
    isLoaded &&
    Boolean(isSignedIn) &&
    !event.viewerParticipation &&
    event.status === "published";
  const canLeave =
    isLoaded &&
    Boolean(isSignedIn) &&
    event.viewerJoined &&
    event.viewerParticipation?.role !== "organizer";
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
        <MobileSection title={event.title}>
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

            <View className="gap-2">
              <Text className="text-sm text-muted-foreground">
                {eventSummary(event)}
              </Text>
              <SocialMetadataLine
                values={[
                  eventTypeLabel(event.type),
                  eventDifficultyLabel(event.difficulty),
                  eventPriceLabel(event),
                  event.beginnerFriendly ? "Beginner friendly" : undefined,
                ]}
              />
            </View>

            {body ? (
              <Text className="text-sm leading-6 text-muted-foreground">{body}</Text>
            ) : null}
          </View>
        </MobileSection>

        <MobileSection title="Event details">
          <View className="gap-2 divide-y divide-border/40">
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
            {!isLoaded ? (
              <Text className="text-sm text-muted-foreground">
                Checking your session.
              </Text>
            ) : null}
            {isLoaded && !isSignedIn ? (
              <Text className="text-sm text-muted-foreground">
                Sign in to join events, save interest, and react to updates.
              </Text>
            ) : null}
            {actionMessage ? (
              <Text className="text-sm text-muted-foreground">{actionMessage}</Text>
            ) : null}
            <View className="flex-row gap-2">
              <View className="flex-1">
                <MobileButton
                  disabled={!canJoin || attendanceMutation.isPending}
                  onPress={() =>
                    attendanceMutation.mutate("join", {
                      onError: () =>
                        setActionMessage("Could not update attendance. Try again."),
                      onSuccess: () =>
                        setActionMessage(
                          event.requiresApproval ? "Join request sent." : "Joined event.",
                        ),
                    })
                  }
                >
                  {event.viewerJoined
                    ? "Joined"
                    : event.requiresApproval
                      ? "Request to join"
                      : "Join"}
                </MobileButton>
              </View>
              {event.viewerJoined ? (
                <View className="flex-1">
                  <MobileButton
                    disabled={!canLeave || attendanceMutation.isPending}
                    variant="danger"
                    onPress={() =>
                      attendanceMutation.mutate("leave", {
                        onError: () =>
                          setActionMessage("Could not update attendance. Try again."),
                        onSuccess: () => setActionMessage("Left event."),
                      })
                    }
                  >
                    Leave
                  </MobileButton>
                </View>
              ) : null}
            </View>
            {event.interestedEnabled ? (
              <MobileButton
                disabled={!canToggleInterest || interestMutation.isPending}
                variant="secondary"
                onPress={() =>
                  interestMutation.mutate(!event.viewerInterested, {
                    onError: (error) => {
                      setActionMessage("Could not update interest. Try again.");
                      if (!shouldQueueFailedMutation(error)) return;
                      void outbox.enqueue({
                        entityId: event.id,
                        entityType: "event",
                        operationType: "event_interest",
                        payload: {
                          eventId: event.id,
                          viewerInterested: event.viewerInterested,
                        },
                      });
                    },
                    onSuccess: () =>
                      setActionMessage(
                        event.viewerInterested
                          ? "Removed interest."
                          : "Marked interested.",
                      ),
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
            {event.viewerParticipation?.role === "organizer" ? (
              <Text className="text-sm text-muted-foreground">
                Organizers cannot leave their own event from mobile.
              </Text>
            ) : null}
            {isLoaded && isSignedIn && event.status !== "published" ? (
              <Text className="text-sm text-muted-foreground">
                Event actions are available after the event is published.
              </Text>
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
                  {postMessage ? (
                    <Text className="text-sm text-muted-foreground">{postMessage}</Text>
                  ) : null}
                  <TextInput
                    className="rounded-2xl border border-border bg-card p-3 text-foreground"
                    onChangeText={setPostTitle}
                    placeholder="Update title"
                    placeholderTextColor="#64748b"
                    value={postTitle}
                  />
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
                        title: postTitle.trim() || undefined,
                      })
                    }
                  >
                    Save draft
                  </MobileButton>
                  {eventPostDraft.draft && draftApplies ? (
                    <MobileButton
                      variant="ghost"
                      onPress={() =>
                        void eventPostDraft.discard().then(() => {
                          setPostBody("");
                          setPostMessage("Draft discarded.");
                          setPostTitle("");
                        })
                      }
                    >
                      Discard draft
                    </MobileButton>
                  ) : null}
                  <MobileButton
                    disabled={createPostMutation.isPending || postBody.trim().length === 0}
                    onPress={() => {
                      const body = postBody.trim();
                      const title = postTitle.trim();
                      if (!body) return;
                      createPostMutation.mutate(
                        {
                          bodyMarkdown: body,
                          title: title || undefined,
                        },
                        {
                          onError: () => {
                            setPostMessage("Could not post update. Saved as draft.");
                            void eventPostDraft.save({
                              bodyMarkdown: body,
                              eventId: event.id,
                              title: title || undefined,
                            });
                          },
                          onSuccess: () => {
                            void eventPostDraft.clearSubmitted();
                            setPostMessage("Posted update.");
                            setPostBody("");
                            setPostTitle("");
                          },
                        },
                      );
                    }}
                  >
                    Post update
                  </MobileButton>
                </View>
              ) : null}

              {eventPostsQuery.isLoading ? (
                <MobileLoadingState message="Loading event updates." />
              ) : null}
              {eventPostsQuery.error ? (
                <View className="gap-3">
                  <MobileErrorState
                    message="Event updates are taking longer than expected to load."
                    title="Updates unavailable"
                  />
                  <MobileButton
                    variant="secondary"
                    onPress={() => void eventPostsQuery.refetch()}
                  >
                    Try again
                  </MobileButton>
                </View>
              ) : null}
              {!eventPostsQuery.isLoading && !eventPostsQuery.error && eventPosts.length === 0 ? (
                <MobileEmptyState
                  description="Event updates will appear here when available."
                  title="No updates"
                />
              ) : null}

              {eventPosts.map((post) => (
                <UserIdentityRow
                  avatarUrl={post.authorAvatarUrl}
                  bottomSlot={
                    <View className="mt-2">
                      <Text className="mt-1 text-sm leading-6 text-foreground">
                        {stripMarkdownPreview(post.bodyMarkdown)}
                      </Text>
                      <SocialMetadataLine
                        values={[
                          `Fish · ${post.fishReactionCount}`,
                        ]}
                      />
                      <SocialActionRow
                        actions={[
                          {
                            accessibilityLabel: post.viewerHasFishReacted
                              ? "Remove fish reaction"
                              : "React with fish",
                            active: post.viewerHasFishReacted,
                            disabled: !isLoaded || !isSignedIn || fishMutation.isPending,
                            icon: post.viewerHasFishReacted ? "fish" : "fish-outline",
                            label: `Fish · ${post.fishReactionCount}`,
                            onPress: () =>
                              fishMutation.mutate(
                                {
                                  hasFish: post.viewerHasFishReacted,
                                  postId: post.id,
                                },
                                {
                                  onError: (error) => {
                                    setPostMessage(
                                      "Could not update fish reaction. Try again.",
                                    );
                                    if (!shouldQueueFailedMutation(error)) return;
                                    void outbox.enqueue({
                                      entityId: post.id,
                                      entityType: "event_post",
                                      operationType: "event_post_fish",
                                      payload: {
                                        eventId: event.id,
                                        postId: post.id,
                                        viewerHasFishReacted: post.viewerHasFishReacted,
                                      },
                                    });
                                  },
                                },
                              ),
                          },
                        ]}
                      />
                    </View>
                  }
                  key={post.id}
                  locationText={new Date(post.createdAt).toLocaleDateString("en-PH", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                  showLocation
                  showUsername={Boolean(post.authorUsername)}
                  size="md"
                  username={post.authorUsername}
                  displayName={post.authorDisplayName || "Organizer"}
                />
              ))}
            </View>
          </MobileSection>
        ) : null}
      </MobileScrollScreen>
    </>
  );
}

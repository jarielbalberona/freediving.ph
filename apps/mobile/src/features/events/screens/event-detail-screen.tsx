import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { useAuth } from "@clerk/expo";
import type { ImagePickerAsset } from "expo-image-picker";

import type { EventJoinFormField, EventPaymentMethod } from "@freediving.ph/types";

import {
  SocialActionRow,
  SocialMetadataLine,
  StatusPill,
  UserIdentityRow,
} from "@/components/social";
import {
  MobileCard,
  MobileEmptyState,
  MobileErrorState,
  MobileLoadingState,
  MobileScrollScreen,
  MobileSection,
} from "@/components/shell";
import { MobileButton } from "@/components/ui/mobile-button";
import { EventDetailRow } from "@/features/events/components/event-detail-row";
import {
  useEventJoinFormFieldsQuery,
  useEventPaymentMethodsQuery,
  useEventPrizesQuery,
  useEventProgramItemsQuery,
  useEventSponsorsQuery,
  useMyEventPassQuery,
} from "@/features/events/hooks/use-event-attendee-queries";
import { useEventDetailQuery } from "@/features/events/hooks/use-event-detail-query";
import {
  useCreateEventPostMutation,
  useEventAttendanceMutation,
  useEventInterestMutation,
  useEventPostFishMutation,
  useSubmitEventPaymentMutation,
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
import { uploadMediaFiles } from "@/features/media/api/media-api";
import {
  filenameForAsset,
  mimeTypeForAsset,
  validatePhotoAsset,
} from "@/features/media/lib/media-upload-guards";
import { useLocalDraft } from "@/local/drafts/use-local-draft";
import { shouldQueueFailedMutation } from "@/local/outbox/supported-operations";
import { useOutbox } from "@/local/outbox/use-outbox";
import { PendingSyncPanel } from "@/local/sync/pending-sync-panel";

const firstParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const paymentStatusLabel = (status: string | undefined) => {
  switch (status) {
    case "not_required":
      return "No payment required";
    case "pending_upload":
      return "Pending proof";
    case "submitted":
      return "Submitted for review";
    case "verified":
      return "Payment verified";
    case "rejected":
      return "Payment rejected";
    default:
      return status ? titleCase(status) : "Payment pending";
  }
};

const participantStatusLabel = (status: string | undefined) => {
  switch (status) {
    case "pending_approval":
      return "Pending approval";
    case "confirmed":
      return "Confirmed";
    case "attended":
      return "Attended";
    case "no_show":
      return "No show";
    default:
      return status ? titleCase(status) : "Not joined";
  }
};

const paymentMethodLabel = (method: EventPaymentMethod | undefined) => {
  if (!method) return "Payment method";
  return (
    method.name?.trim() ||
    [method.bankName, method.accountName].filter(Boolean).join(" · ") ||
    titleCase(method.type)
  );
};

const joinAnswerDefault = (field: EventJoinFormField) =>
  field.fieldType === "checkbox" ? "false" : "";

const nativeFileFromAsset = (asset: ImagePickerAsset, fallbackPrefix: string) => ({
  name: filenameForAsset(asset, fallbackPrefix),
  type: mimeTypeForAsset(asset),
  uri: asset.uri,
});

export function EventDetailScreen() {
  const params = useLocalSearchParams<{ slug?: string | string[] }>();
  const router = useRouter();
  const slug = firstParam(params.slug);
  const eventQuery = useEventDetailQuery(slug);
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const event = eventQuery.data?.event;
  const eventPostsQuery = useEventPostsQuery(
    event?.id,
    Boolean(event?.postsEnabled),
  );
  const joinFieldsQuery = useEventJoinFormFieldsQuery(
    event?.id,
    Boolean(event) && !event?.viewerParticipation,
  );
  const paymentMethodsQuery = useEventPaymentMethodsQuery(
    event?.id,
    Boolean(event?.paymentEnabled && event.viewerJoined),
  );
  const myPassQuery = useMyEventPassQuery(
    event?.id,
    Boolean(event?.viewerJoined || event?.viewerParticipation),
  );
  const programQuery = useEventProgramItemsQuery(
    event?.id,
    Boolean(event?.programEnabled && event.viewerCanViewPrivateDetails),
  );
  const prizesQuery = useEventPrizesQuery(
    event?.id,
    Boolean(event?.awardsEnabled && event.viewerCanViewPrivateDetails),
  );
  const sponsorsQuery = useEventSponsorsQuery(
    event?.id,
    Boolean(event?.sponsorsEnabled && event.viewerCanViewPrivateDetails),
  );
  const attendanceMutation = useEventAttendanceMutation(slug ?? "", event?.id ?? "");
  const interestMutation = useEventInterestMutation(slug ?? "", event?.id ?? "");
  const createPostMutation = useCreateEventPostMutation(slug ?? "", event?.id ?? "");
  const fishMutation = useEventPostFishMutation(slug ?? "", event?.id ?? "");
  const submitPaymentMutation = useSubmitEventPaymentMutation(
    slug ?? "",
    event?.id ?? "",
  );
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [joinAnswers, setJoinAnswers] = useState<Record<string, string>>({});
  const [participantNote, setParticipantNote] = useState("");
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentProof, setPaymentProof] = useState<ImagePickerAsset | undefined>();
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);
  const [isUploadingPaymentProof, setIsUploadingPaymentProof] = useState(false);
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

  useEffect(() => {
    const fields = joinFieldsQuery.data ?? [];
    if (fields.length === 0) return;
    setJoinAnswers((current) => {
      const next = { ...current };
      for (const field of fields) {
        if (!(field.fieldKey in next)) {
          next[field.fieldKey] = joinAnswerDefault(field);
        }
      }
      return next;
    });
  }, [joinFieldsQuery.data]);

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

  const coverUrl = safeImageUrl(event.coverUrl ?? event.coverPhotoUrl ?? undefined);
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
  const joinFields = (joinFieldsQuery.data ?? []).filter((field) => field.enabled);
  const missingRequiredJoinFields = joinFields.filter(
    (field) =>
      field.required &&
      !String(joinAnswers[field.fieldKey] ?? "").trim(),
  );
  const paymentMethods =
    paymentMethodsQuery.data ?? event.paymentMethods ?? [];
  const activePaymentMethods = paymentMethods.filter((method) => method.isActive);
  const selectedPaymentMethod =
    activePaymentMethods.find((method) => method.id === selectedPaymentMethodId) ??
    activePaymentMethods[0];
  const viewerPayment =
    event.viewerPayment ?? event.viewerParticipation?.payment ?? myPassQuery.data?.payment;
  const paymentStatus =
    viewerPayment?.status ??
    (event.paymentMode === "required" ? "pending_upload" : "not_required");
  const canSubmitPayment =
    isLoaded &&
    Boolean(isSignedIn) &&
    event.viewerJoined &&
    event.paymentEnabled &&
    event.paymentMode !== "free" &&
    Boolean(selectedPaymentMethod) &&
    Boolean(paymentProof) &&
    !submitPaymentMutation.isPending &&
    !isUploadingPaymentProof;
  const pass = myPassQuery.data;
  const passParticipant = pass?.participant ?? event.viewerParticipation;
  const passUrl =
    event.slug && passParticipant?.qrToken
      ? `https://freediving.ph/events/${encodeURIComponent(event.slug)}/pass/${encodeURIComponent(passParticipant.qrToken)}`
      : undefined;
  const programItems = programQuery.data ?? [];
  const prizes = prizesQuery.data?.prizes ?? [];
  const competitions = prizesQuery.data?.competitions ?? [];
  const sponsors = (sponsorsQuery.data ?? []).filter((sponsor) => sponsor.isActive);

  const updateJoinAnswer = (field: EventJoinFormField, value: string) => {
    setJoinAnswers((current) => ({
      ...current,
      [field.fieldKey]: value,
    }));
  };

  const choosePaymentProof = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync(false);
    if (!permission.granted) {
      setPaymentMessage("Allow photo library access to choose payment proof.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      allowsMultipleSelection: false,
      mediaTypes: ["images"],
      quality: 0.9,
    });
    if (result.canceled) return;
    const selected = result.assets[0];
    const error = selected ? validatePhotoAsset(selected) : "Choose a payment proof image.";
    if (error) {
      setPaymentMessage(error);
      return;
    }
    setPaymentProof(selected);
    setPaymentMessage(null);
  };

  const submitPaymentProof = async () => {
    if (!selectedPaymentMethod || !paymentProof) {
      setPaymentMessage("Choose a payment method and proof image first.");
      return;
    }
    const token = await getToken();
    if (!token) {
      setPaymentMessage("Sign in to submit payment proof.");
      return;
    }
    setIsUploadingPaymentProof(true);
    setPaymentMessage("Uploading proof.");
    try {
      const upload = await uploadMediaFiles(
        [nativeFileFromAsset(paymentProof, "event-payment-proof")],
        "event_attachment",
        token,
        event.id,
      );
      const proofMediaId = upload.items[0]?.id;
      if (!proofMediaId) {
        setPaymentMessage(
          upload.errors?.[0]?.message ?? "Could not upload payment proof.",
        );
        return;
      }
      submitPaymentMutation.mutate(
        {
          paymentMethodId: selectedPaymentMethod.id,
          proofMediaId,
          referenceNumber: paymentReference.trim() || undefined,
        },
        {
          onError: () => setPaymentMessage("Could not submit proof. Try again."),
          onSuccess: () => {
            setPaymentMessage("Payment proof submitted for review.");
            setPaymentProof(undefined);
            setPaymentReference("");
          },
        },
      );
    } finally {
      setIsUploadingPaymentProof(false);
    }
  };

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

        {event.viewerCanManage ? (
          <MobileSection title="Organizer">
            <MobileCard>
              <View className="gap-3">
                <View className="flex-row flex-wrap gap-2">
                  <StatusPill tone="primary">Organizer access</StatusPill>
                  <StatusPill>{participantStatusLabel(event.viewerParticipation?.status)}</StatusPill>
                </View>
                <MobileButton
                  onPress={() =>
                    router.push({
                      pathname: "/(app)/(tabs)/(home)/events/[slug]/manage",
                      params: { slug: event.slug },
                    })
                  }
                >
                  Manage event
                </MobileButton>
              </View>
            </MobileCard>
          </MobileSection>
        ) : null}

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
            {joinFields.length > 0 && !event.viewerParticipation ? (
              <View className="gap-3 rounded-2xl border border-border bg-card p-3">
                <Text className="text-sm font-semibold text-foreground">
                  Join form
                </Text>
                {joinFields.map((field) => {
                  const value = joinAnswers[field.fieldKey] ?? "";
                  if (field.fieldType === "checkbox") {
                    const checked = value === "true";
                    return (
                      <MobileButton
                        key={field.id}
                        variant={checked ? "primary" : "secondary"}
                        onPress={() =>
                          updateJoinAnswer(field, checked ? "false" : "true")
                        }
                      >
                        {field.label}
                      </MobileButton>
                    );
                  }
                  return (
                    <TextInput
                      className="min-h-11 rounded-2xl border border-border bg-background px-3 text-foreground"
                      key={field.id}
                      multiline={field.fieldType === "long_text"}
                      onChangeText={(text) => updateJoinAnswer(field, text)}
                      placeholder={`${field.label}${field.required ? " *" : ""}`}
                      placeholderTextColor="#64748b"
                      value={value}
                    />
                  );
                })}
                {missingRequiredJoinFields.length > 0 ? (
                  <Text className="text-xs text-muted-foreground">
                    Complete required join form fields before joining.
                  </Text>
                ) : null}
              </View>
            ) : null}
            {!event.viewerParticipation ? (
              <TextInput
                className="min-h-11 rounded-2xl border border-border bg-card px-3 text-foreground"
                multiline
                onChangeText={setParticipantNote}
                placeholder="Optional note for the organizer"
                placeholderTextColor="#64748b"
                value={participantNote}
              />
            ) : null}
            {actionMessage ? (
              <Text className="text-sm text-muted-foreground">{actionMessage}</Text>
            ) : null}
            <View className="flex-row gap-2">
              <View className="flex-1">
                <MobileButton
                  disabled={
                    !canJoin ||
                    attendanceMutation.isPending ||
                    missingRequiredJoinFields.length > 0
                  }
                  onPress={() =>
                    attendanceMutation.mutate({
                      action: "join",
                      joinAnswers,
                      participantNote: participantNote.trim() || undefined,
                    }, {
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
            <EventDetailRow
              label="Your status"
              value={participantStatusLabel(event.viewerParticipation?.status)}
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

        {event.viewerJoined || event.viewerParticipation ? (
          <MobileSection title="Event pass">
            <MobileCard>
              <View className="gap-3">
                {myPassQuery.isLoading ? (
                  <MobileLoadingState message="Loading event pass." />
                ) : null}
                <View className="flex-row flex-wrap gap-2">
                  <StatusPill tone={passParticipant?.status === "confirmed" ? "primary" : "neutral"}>
                    {participantStatusLabel(passParticipant?.status)}
                  </StatusPill>
                  {paymentStatus !== "not_required" ? (
                    <StatusPill tone={paymentStatus === "verified" ? "primary" : "neutral"}>
                      {paymentStatusLabel(paymentStatus)}
                    </StatusPill>
                  ) : null}
                </View>
                <EventDetailRow
                  label="Pass token"
                  value={passParticipant?.qrToken || "Issued after confirmation"}
                />
                {passUrl ? (
                  <EventDetailRow label="Pass link" value={passUrl} />
                ) : null}
                <Text className="text-xs leading-5 text-muted-foreground">
                  Keep this pass available for event check-in. Mobile shows the
                  canonical pass token and link; organizer scanning stays in the
                  management initiative.
                </Text>
              </View>
            </MobileCard>
          </MobileSection>
        ) : null}

        {event.paymentEnabled && event.paymentMode !== "free" ? (
          <MobileSection title="Payment">
            <MobileCard>
              <View className="gap-3">
                <View className="flex-row flex-wrap gap-2">
                  <StatusPill tone={paymentStatus === "verified" ? "primary" : "neutral"}>
                    {paymentStatusLabel(paymentStatus)}
                  </StatusPill>
                  <StatusPill>{eventPriceLabel(event)}</StatusPill>
                </View>
                {event.paymentInstructions ? (
                  <Text className="text-sm leading-6 text-muted-foreground">
                    {event.paymentInstructions}
                  </Text>
                ) : null}
                {paymentMethodsQuery.isLoading ? (
                  <MobileLoadingState message="Loading payment methods." />
                ) : null}
                {activePaymentMethods.length > 0 ? (
                  <View className="gap-2">
                    {activePaymentMethods.map((method) => {
                      const selected = selectedPaymentMethod?.id === method.id;
                      return (
                        <MobileButton
                          key={method.id}
                          variant={selected ? "primary" : "secondary"}
                          onPress={() => setSelectedPaymentMethodId(method.id)}
                        >
                          {paymentMethodLabel(method)}
                        </MobileButton>
                      );
                    })}
                    {selectedPaymentMethod ? (
                      <View className="gap-1 rounded-2xl bg-secondary p-3">
                        <EventDetailRow
                          label="Instructions"
                          value={selectedPaymentMethod.instructions}
                        />
                        <EventDetailRow
                          label="Account"
                          value={[selectedPaymentMethod.accountName, selectedPaymentMethod.accountNumber]
                            .filter(Boolean)
                            .join(" · ")}
                        />
                        <EventDetailRow
                          label="Bank"
                          value={selectedPaymentMethod.bankName}
                        />
                      </View>
                    ) : null}
                  </View>
                ) : (
                  <Text className="text-sm text-muted-foreground">
                    Payment setup is not ready yet.
                  </Text>
                )}
                {event.viewerJoined && activePaymentMethods.length > 0 ? (
                  <View className="gap-3">
                    {paymentMessage ? (
                      <Text className="text-sm text-muted-foreground">
                        {paymentMessage}
                      </Text>
                    ) : null}
                    <TextInput
                      className="min-h-11 rounded-2xl border border-border bg-background px-3 text-foreground"
                      onChangeText={setPaymentReference}
                      placeholder="Reference number"
                      placeholderTextColor="#64748b"
                      value={paymentReference}
                    />
                    <MobileButton
                      disabled={isUploadingPaymentProof || submitPaymentMutation.isPending}
                      variant="secondary"
                      onPress={choosePaymentProof}
                    >
                      {paymentProof ? paymentProof.fileName || "Proof selected" : "Choose proof image"}
                    </MobileButton>
                    <MobileButton
                      disabled={!canSubmitPayment}
                      onPress={() => void submitPaymentProof()}
                    >
                      Submit payment proof
                    </MobileButton>
                  </View>
                ) : null}
              </View>
            </MobileCard>
          </MobileSection>
        ) : null}

        {event.programEnabled && event.viewerCanViewPrivateDetails ? (
          <MobileSection title="Program">
            {programQuery.isLoading ? (
              <MobileLoadingState message="Loading program." />
            ) : programItems.length > 0 ? (
              <View className="gap-3">
                {programItems.map((item) => (
                  <MobileCard key={item.id}>
                    <View className="gap-1">
                      <Text className="text-sm font-semibold text-foreground">
                        {item.title}
                      </Text>
                      <SocialMetadataLine
                        values={[
                          item.programDate,
                          [item.startTime, item.endTime].filter(Boolean).join(" to "),
                          item.locationLabel,
                        ]}
                      />
                      {item.descriptionMarkdown ? (
                        <Text className="text-sm leading-6 text-muted-foreground">
                          {stripMarkdownPreview(item.descriptionMarkdown)}
                        </Text>
                      ) : null}
                    </View>
                  </MobileCard>
                ))}
              </View>
            ) : (
              <MobileEmptyState
                description="Program items will appear when the organizer publishes them."
                title="No program yet"
              />
            )}
          </MobileSection>
        ) : null}

        {event.awardsEnabled && event.viewerCanViewPrivateDetails ? (
          <MobileSection title="Competitions and prizes">
            {prizesQuery.isLoading ? (
              <MobileLoadingState message="Loading prizes." />
            ) : competitions.length > 0 || prizes.length > 0 ? (
              <View className="gap-3">
                {competitions.map((competition) => (
                  <MobileCard key={competition.id}>
                    <View className="gap-1">
                      <Text className="text-sm font-semibold text-foreground">
                        {competition.name}
                      </Text>
                      {competition.descriptionMarkdown ? (
                        <Text className="text-sm leading-6 text-muted-foreground">
                          {stripMarkdownPreview(competition.descriptionMarkdown)}
                        </Text>
                      ) : null}
                    </View>
                  </MobileCard>
                ))}
                {prizes.map((prize) => (
                  <MobileCard key={prize.id}>
                    <View className="gap-1">
                      <Text className="text-sm font-semibold text-foreground">
                        {prize.title}
                      </Text>
                      <SocialMetadataLine
                        values={[
                          prize.placementLabel || titleCase(prize.placement),
                          prize.prizeType ? titleCase(prize.prizeType) : undefined,
                        ]}
                      />
                      {prize.descriptionMarkdown ? (
                        <Text className="text-sm leading-6 text-muted-foreground">
                          {stripMarkdownPreview(prize.descriptionMarkdown)}
                        </Text>
                      ) : null}
                    </View>
                  </MobileCard>
                ))}
              </View>
            ) : (
              <MobileEmptyState
                description="Competition and prize details will appear when published."
                title="No prizes yet"
              />
            )}
          </MobileSection>
        ) : null}

        {event.sponsorsEnabled && event.viewerCanViewPrivateDetails ? (
          <MobileSection title="Sponsors">
            {sponsorsQuery.isLoading ? (
              <MobileLoadingState message="Loading sponsors." />
            ) : sponsors.length > 0 ? (
              <View className="gap-3">
                {sponsors.map((sponsor) => (
                  <MobileCard key={sponsor.id}>
                    <View className="gap-1">
                      <Text className="text-sm font-semibold text-foreground">
                        {sponsor.name}
                      </Text>
                      <SocialMetadataLine
                        values={[sponsor.tier ? titleCase(sponsor.tier) : undefined]}
                      />
                      {sponsor.description ? (
                        <Text className="text-sm leading-6 text-muted-foreground">
                          {sponsor.description}
                        </Text>
                      ) : null}
                    </View>
                  </MobileCard>
                ))}
              </View>
            ) : (
              <MobileEmptyState
                description="Sponsor details will appear when published."
                title="No sponsors yet"
              />
            )}
          </MobileSection>
        ) : null}

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

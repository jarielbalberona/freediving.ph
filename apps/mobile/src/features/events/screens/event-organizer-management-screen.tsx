import { Stack, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Linking, Text, TextInput, View } from "react-native";
import { useAuth } from "@clerk/expo";
import type { EventParticipant } from "@freediving.ph/types";

import { StatusPill } from "@/components/social";
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
import { useEventDetailQuery } from "@/features/events/hooks/use-event-detail-query";
import {
  useEventCheckInMutation,
  useEventParticipantActionMutation,
  useEventParticipantsQuery,
  useEventPaymentReviewMutation,
  useEventProofUrlMutation,
} from "@/features/events/hooks/use-event-management";
import { titleCase } from "@/features/events/lib/event-format";

const firstParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const statusLabel = (value: string | undefined) =>
  value ? titleCase(value) : "Unknown";

const participantName = (participant: EventParticipant) =>
  participant.displayName || participant.username || "Participant";

const participantSearchValue = (participant: EventParticipant) =>
  [
    participant.displayName,
    participant.username,
    participant.status,
    participant.role,
    participant.payment?.status,
    participant.payment?.referenceNumber,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

const confirmAction = (title: string, message: string, onConfirm: () => void) => {
  Alert.alert(title, message, [
    { style: "cancel", text: "Cancel" },
    { onPress: onConfirm, style: "destructive", text: "Confirm" },
  ]);
};

const countByStatus = (participants: EventParticipant[], status: string) =>
  participants.filter((participant) => participant.status === status).length;

export function EventOrganizerManagementScreen() {
  const params = useLocalSearchParams<{ slug?: string | string[] }>();
  const slug = firstParam(params.slug);
  const { isLoaded, isSignedIn } = useAuth();
  const eventQuery = useEventDetailQuery(slug);
  const event = eventQuery.data?.event;
  const canManage = Boolean(event?.viewerCanManage);
  const participantsQuery = useEventParticipantsQuery(event?.id, canManage);
  const participantAction = useEventParticipantActionMutation(
    slug ?? "",
    event?.id ?? "",
  );
  const paymentReview = useEventPaymentReviewMutation(slug ?? "", event?.id ?? "");
  const proofUrlMutation = useEventProofUrlMutation(event?.id ?? "");
  const checkInMutation = useEventCheckInMutation(slug ?? "", event?.id ?? "");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | EventParticipant["status"]>(
    "all",
  );
  const [checkInToken, setCheckInToken] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const participants = participantsQuery.data ?? [];
  const filteredParticipants = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return participants.filter((participant) => {
      const statusMatches =
        statusFilter === "all" || participant.status === statusFilter;
      const searchMatches =
        !needle || participantSearchValue(participant).includes(needle);
      return statusMatches && searchMatches;
    });
  }, [participants, search, statusFilter]);

  if (!slug) {
    return (
      <MobileScrollScreen subtitle="Organizer" title="Event management">
        <Stack.Screen options={{ title: "Event management" }} />
        <MobileEmptyState
          description="Open management from an event detail screen."
          title="Event unavailable"
        />
      </MobileScrollScreen>
    );
  }

  if (eventQuery.isLoading || !isLoaded) {
    return (
      <MobileScrollScreen subtitle="Organizer" title="Event management">
        <Stack.Screen options={{ title: "Event management" }} />
        <MobileLoadingState message="Checking organizer access." />
      </MobileScrollScreen>
    );
  }

  if (!isSignedIn) {
    return (
      <MobileScrollScreen subtitle="Organizer" title="Event management">
        <Stack.Screen options={{ title: "Event management" }} />
        <MobileEmptyState
          description="Sign in with an organizer or admin account to manage this event."
          title="Organizer access required"
        />
      </MobileScrollScreen>
    );
  }

  if (eventQuery.error || !event) {
    return (
      <MobileScrollScreen subtitle="Organizer" title="Event management">
        <Stack.Screen options={{ title: "Event management" }} />
        <View className="gap-3">
          <MobileErrorState
            message="This event workspace is unavailable."
            title="Event unavailable"
          />
          <MobileButton variant="secondary" onPress={() => void eventQuery.refetch()}>
            Try again
          </MobileButton>
        </View>
      </MobileScrollScreen>
    );
  }

  if (!canManage) {
    return (
      <MobileScrollScreen subtitle="Organizer" title="Event management">
        <Stack.Screen options={{ title: "Event management" }} />
        <MobileEmptyState
          description="The backend did not grant organizer management access for this event."
          title="Organizer access required"
        />
      </MobileScrollScreen>
    );
  }

  const runParticipantAction = (
    participant: EventParticipant,
    action: "approve" | "reject" | "status",
    status?: Extract<EventParticipant["status"], "attended" | "cancelled" | "confirmed" | "no_show">,
  ) => {
    participantAction.mutate(
      { action, participantId: participant.id, status },
      {
        onError: () => setMessage("Could not update participant. Try again."),
        onSuccess: () => setMessage("Participant updated."),
      },
    );
  };

  const reviewPayment = (
    participant: EventParticipant,
    status: "rejected" | "verified",
  ) => {
    const paymentId = participant.payment?.id;
    if (!paymentId) {
      setMessage("Payment record unavailable.");
      return;
    }
    paymentReview.mutate(
      { paymentId, reviewNotes, status },
      {
        onError: () => setMessage("Could not review payment. Try again."),
        onSuccess: () => {
          setMessage(status === "verified" ? "Payment approved." : "Payment rejected.");
          setReviewNotes("");
        },
      },
    );
  };

  const openProof = (participant: EventParticipant) => {
    const paymentId = participant.payment?.id;
    if (!paymentId) {
      setMessage("Payment proof unavailable.");
      return;
    }
    proofUrlMutation.mutate(paymentId, {
      onError: () => setMessage("Could not open payment proof."),
      onSuccess: (proof) => void Linking.openURL(proof.url),
    });
  };

  const checkInTokenNow = () => {
    const token = checkInToken.trim();
    if (!token) {
      setMessage("Enter a pass token to check in.");
      return;
    }
    checkInMutation.mutate(token, {
      onError: () => setMessage("Could not check in that pass."),
      onSuccess: (pass) => {
        setMessage(
          pass.alreadyCheckedIn
            ? "Pass was already checked in."
            : `${participantName(pass.participant)} checked in.`,
        );
        setCheckInToken("");
      },
    });
  };

  return (
    <MobileScrollScreen subtitle="Organizer" title="Event management">
      <Stack.Screen options={{ title: "Event management" }} />

      <MobileSection title={event.title}>
        <MobileCard>
          <View className="gap-3">
            <View className="flex-row flex-wrap gap-2">
              <StatusPill tone="primary">Organizer access</StatusPill>
              <StatusPill>{statusLabel(event.status)}</StatusPill>
              <StatusPill>{participants.length} participants</StatusPill>
            </View>
            <View className="gap-2 divide-y divide-border/40">
              <EventDetailRow label="Pending approval" value={countByStatus(participants, "pending_approval")} />
              <EventDetailRow label="Confirmed" value={countByStatus(participants, "confirmed")} />
              <EventDetailRow label="Attended" value={countByStatus(participants, "attended")} />
              <EventDetailRow
                label="Payment reviews"
                value={participants.filter((item) => item.payment?.status === "submitted").length}
              />
            </View>
          </View>
        </MobileCard>
      </MobileSection>

      <MobileSection title="Check-in">
        <MobileCard>
          <View className="gap-3">
            <TextInput
              autoCapitalize="none"
              className="min-h-11 rounded-2xl border border-border bg-background px-3 text-foreground"
              onChangeText={setCheckInToken}
              placeholder="Paste pass token"
              placeholderTextColor="#64748b"
              value={checkInToken}
            />
            <MobileButton
              disabled={checkInMutation.isPending || checkInToken.trim().length === 0}
              onPress={checkInTokenNow}
            >
              Check in pass
            </MobileButton>
            <Text className="text-xs leading-5 text-muted-foreground">
              Mobile uses the backend pass check-in endpoint. Camera scanning can be
              added later without changing the check-in contract.
            </Text>
          </View>
        </MobileCard>
      </MobileSection>

      <MobileSection title="Participants">
        <View className="gap-3">
          {message ? (
            <Text className="text-sm text-muted-foreground">{message}</Text>
          ) : null}
          <TextInput
            autoCapitalize="none"
            className="min-h-11 rounded-2xl border border-border bg-card px-3 text-foreground"
            onChangeText={setSearch}
            placeholder="Search name, username, reference"
            placeholderTextColor="#64748b"
            value={search}
          />
          <View className="flex-row flex-wrap gap-2">
            {(["all", "pending_approval", "confirmed", "attended", "no_show"] as const).map(
              (status) => (
                <MobileButton
                  key={status}
                  variant={statusFilter === status ? "primary" : "secondary"}
                  onPress={() => setStatusFilter(status)}
                >
                  {status === "all" ? "All" : statusLabel(status)}
                </MobileButton>
              ),
            )}
          </View>

          {participantsQuery.isLoading ? (
            <MobileLoadingState message="Loading participants." />
          ) : null}
          {participantsQuery.error ? (
            <View className="gap-3">
              <MobileErrorState
                message="Organizer participant data is unavailable."
                title="Participants unavailable"
              />
              <MobileButton
                variant="secondary"
                onPress={() => void participantsQuery.refetch()}
              >
                Try again
              </MobileButton>
            </View>
          ) : null}
          {!participantsQuery.isLoading &&
          !participantsQuery.error &&
          filteredParticipants.length === 0 ? (
            <MobileEmptyState
              description="Adjust filters or wait for participants to join."
              title="No participants"
            />
          ) : null}

          {filteredParticipants.map((participant) => {
            const payment = participant.payment;
            return (
              <MobileCard key={participant.id}>
                <View className="gap-3">
                  <View className="gap-1">
                    <Text className="text-base font-semibold text-foreground">
                      {participantName(participant)}
                    </Text>
                    <View className="flex-row flex-wrap gap-2">
                      <StatusPill>{statusLabel(participant.status)}</StatusPill>
                      <StatusPill>{statusLabel(participant.role)}</StatusPill>
                      {payment ? (
                        <StatusPill
                          tone={payment.status === "verified" ? "primary" : "neutral"}
                        >
                          Payment {statusLabel(payment.status)}
                        </StatusPill>
                      ) : null}
                    </View>
                  </View>
                  <View className="gap-2 divide-y divide-border/40">
                    <EventDetailRow label="Username" value={participant.username} />
                    <EventDetailRow label="Note" value={participant.participantNote} />
                    <EventDetailRow
                      label="Reference"
                      value={payment?.referenceNumber}
                    />
                    <EventDetailRow
                      label="Checked in"
                      value={participant.checkedInAt ? "Yes" : "No"}
                    />
                  </View>

                  {participant.status === "pending_approval" ? (
                    <View className="flex-row gap-2">
                      <View className="flex-1">
                        <MobileButton
                          disabled={participantAction.isPending}
                          onPress={() =>
                            runParticipantAction(participant, "approve")
                          }
                        >
                          Approve
                        </MobileButton>
                      </View>
                      <View className="flex-1">
                        <MobileButton
                          disabled={participantAction.isPending}
                          variant="danger"
                          onPress={() =>
                            confirmAction(
                              "Reject participant",
                              `Reject ${participantName(participant)} from this event?`,
                              () => runParticipantAction(participant, "reject"),
                            )
                          }
                        >
                          Reject
                        </MobileButton>
                      </View>
                    </View>
                  ) : null}

                  {participant.status === "confirmed" ? (
                    <View className="flex-row gap-2">
                      <View className="flex-1">
                        <MobileButton
                          disabled={participantAction.isPending}
                          variant="secondary"
                          onPress={() =>
                            runParticipantAction(participant, "status", "attended")
                          }
                        >
                          Mark attended
                        </MobileButton>
                      </View>
                      <View className="flex-1">
                        <MobileButton
                          disabled={participantAction.isPending}
                          variant="danger"
                          onPress={() =>
                            confirmAction(
                              "Mark no-show",
                              `Mark ${participantName(participant)} as no-show?`,
                              () =>
                                runParticipantAction(participant, "status", "no_show"),
                            )
                          }
                        >
                          No-show
                        </MobileButton>
                      </View>
                    </View>
                  ) : null}

                  {participant.status === "attended" ||
                  participant.status === "no_show" ? (
                    <MobileButton
                      disabled={participantAction.isPending}
                      variant="secondary"
                      onPress={() =>
                        runParticipantAction(participant, "status", "confirmed")
                      }
                    >
                      Restore confirmed
                    </MobileButton>
                  ) : null}

                  {payment ? (
                    <View className="gap-3 rounded-2xl border border-border bg-background p-3">
                      <TextInput
                        className="min-h-11 rounded-2xl border border-border bg-card px-3 text-foreground"
                        onChangeText={setReviewNotes}
                        placeholder="Review note"
                        placeholderTextColor="#64748b"
                        value={reviewNotes}
                      />
                      <View className="flex-row gap-2">
                        <View className="flex-1">
                          <MobileButton
                            disabled={proofUrlMutation.isPending}
                            variant="secondary"
                            onPress={() => openProof(participant)}
                          >
                            Open proof
                          </MobileButton>
                        </View>
                        <View className="flex-1">
                          <MobileButton
                            disabled={paymentReview.isPending}
                            onPress={() => reviewPayment(participant, "verified")}
                          >
                            Approve payment
                          </MobileButton>
                        </View>
                      </View>
                      <MobileButton
                        disabled={paymentReview.isPending}
                        variant="danger"
                        onPress={() =>
                          confirmAction(
                            "Reject payment",
                            `Reject payment for ${participantName(participant)}?`,
                            () => reviewPayment(participant, "rejected"),
                          )
                        }
                      >
                        Reject payment
                      </MobileButton>
                    </View>
                  ) : null}
                </View>
              </MobileCard>
            );
          })}
        </View>
      </MobileSection>
    </MobileScrollScreen>
  );
}

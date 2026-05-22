"use client";

import type {
  Event,
  EventDifficulty,
  EventEntryType,
  EventParticipant,
  EventPaymentMethodType,
  EventPaymentMethod,
  UpdateEventRequest,
} from "@freediving.ph/types";
import { SignInButton } from "@clerk/nextjs";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Lock,
  MapPin,
  ShieldCheck,
  Star,
  Ticket,
  Users,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { UserIdentityHeader } from "@/components/common/UserIdentityHeader";
import {
  CommunityEmptyState,
  CommunityHeader,
  CommunityPageShell,
} from "@/components/community/community-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/features/auth/session";
import { ChikaMarkdown } from "@/features/chika/components/ChikaMarkdown";
import {
  eventOptionLabel,
  difficultyOptions,
  entryTypeOptions,
  titleCase,
  useApproveEventParticipant,
  useCreateEventPaymentMethod,
  useEvent,
  useEventPaymentProofUrl,
  useEventParticipants,
  useJoinEvent,
  useLeaveEvent,
  useMarkEventInterested,
  useMarkEventUninterested,
  useRejectEventParticipant,
  useRejectEventPayment,
  useSubmitEventPayment,
  useUpdateEvent,
  useVerifyEventPayment,
} from "@/features/events";
import { mediaApi } from "@/features/media/api/media";
import { getApiErrorMessage, getApiErrorStatus } from "@/lib/http/api-error";

export default function EventDetailClient({ slug }: { slug: string }) {
  const session = useSession();
  const isSignedIn = session.status === "signed_in";
  const [joinNote, setJoinNote] = useState("");
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [isUploadingProof, setIsUploadingProof] = useState(false);

  const eventQuery = useEvent(slug);
  const event = eventQuery.data;
  const eventId = event?.id ?? "";
  const participantsQuery = useEventParticipants(
    eventId,
    Boolean(eventId) &&
      Boolean(event) &&
      (event?.visibility === "public" ||
        event?.viewerCanViewPrivateDetails ||
        event?.viewerCanManage),
  );
  const joinMutation = useJoinEvent();
  const leaveMutation = useLeaveEvent();
  const markInterestedMutation = useMarkEventInterested();
  const markUninterestedMutation = useMarkEventUninterested();
  const submitPaymentMutation = useSubmitEventPayment();
  const approveParticipantMutation = useApproveEventParticipant();
  const rejectParticipantMutation = useRejectEventParticipant();
  const verifyPaymentMutation = useVerifyEventPayment();
  const rejectPaymentMutation = useRejectEventPayment();
  const proofUrlMutation = useEventPaymentProofUrl();

  const participants = useMemo(
    () =>
      participantsQuery.data?.participants ??
      participantsQuery.data?.attendees ??
      [],
    [participantsQuery.data],
  );

  if (eventQuery.isLoading) {
    return (
      <CommunityPageShell>
        <CommunityHeader
          eyebrow="Events"
          title="Opening event"
          subtitle="Loading schedule, dive site, and participation state."
          action={<BackButton />}
        />
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      </CommunityPageShell>
    );
  }

  if (eventQuery.error || !event) {
    return (
      <CommunityPageShell>
        <CommunityHeader
          eyebrow="Events"
          title="Event unavailable"
          subtitle="This event is taking longer than expected to open."
          action={<BackButton />}
        />
        <Card className="border-destructive/30 bg-destructive/5 py-0">
          <CardContent className="p-3 text-sm text-destructive">
            {getApiErrorMessage(
              eventQuery.error,
              "This event could not be opened. Try again in a moment.",
            )}
          </CardContent>
        </Card>
      </CommunityPageShell>
    );
  }

  const canSeePrivateDetails =
    event.visibility === "public" || event.viewerCanViewPrivateDetails;
  const paymentMethods = event.paymentMethods ?? [];
  const selectedPaymentMethod =
    paymentMethods.find((method) => method.id === selectedPaymentMethodId) ??
    paymentMethods[0];

  const handleJoin = () => {
    joinMutation.mutate(
      { eventId, participantNote: joinNote.trim() || undefined },
      {
        onSuccess: (participant) => {
          setJoinNote("");
          void eventQuery.refetch();
          toast.success(
            participant.status === "pending_approval"
              ? "Request sent."
              : "Joined event.",
          );
        },
        onError: (error) => {
          const status = getApiErrorStatus(error);
          if (status === 401 || status === 403) {
            toast.error("Sign in first before joining this event.");
            return;
          }
          toast.error(getApiErrorMessage(error, "Failed to join event"));
        },
      },
    );
  };

  const handleLeave = () => {
    leaveMutation.mutate(
      { eventId },
      {
        onSuccess: () => {
          void eventQuery.refetch();
          toast.success("Left event.");
        },
        onError: (error) => {
          toast.error(getApiErrorMessage(error, "Failed to leave event"));
        },
      },
    );
  };

  const handleMarkInterested = () => {
    markInterestedMutation.mutate(
      { eventId: event.id },
      {
        onSuccess: () => toast.success("Marked interested."),
        onError: (error) => {
          const status = getApiErrorStatus(error);
          if (status === 401 || status === 403) {
            toast.error("Sign in first before marking interest.");
            return;
          }
          toast.error(
            getApiErrorMessage(error, "Failed to mark event interested"),
          );
        },
      },
    );
  };

  const handleMarkUninterested = () => {
    markUninterestedMutation.mutate(
      { eventId: event.id },
      {
        onSuccess: () => toast.success("Removed interest."),
        onError: (error) => {
          toast.error(
            getApiErrorMessage(error, "Failed to remove event interest"),
          );
        },
      },
    );
  };

  const handleSubmitPayment = async () => {
    if (!selectedPaymentMethod) {
      toast.error("Select a payment method first.");
      return;
    }
    if (!proofFile) {
      toast.error("Upload proof of payment first.");
      return;
    }
    setIsUploadingProof(true);
    try {
      const upload = await mediaApi.upload(
        proofFile,
        "event_attachment",
        event.id,
      );
      submitPaymentMutation.mutate(
        {
          eventId: event.id,
          paymentMethodId: selectedPaymentMethod.id,
          proofMediaId: upload.id,
          referenceNumber: referenceNumber.trim() || undefined,
        },
        {
          onSuccess: () => {
            setProofFile(null);
            setReferenceNumber("");
            toast.success("Payment proof submitted for review.");
          },
          onError: (error) => {
            toast.error(
              getApiErrorMessage(error, "Failed to submit payment proof"),
            );
          },
        },
      );
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to upload payment proof"));
    } finally {
      setIsUploadingProof(false);
    }
  };

  const handleViewPaymentProof = (paymentId: string) => {
    proofUrlMutation.mutate(
      { eventId: event.id, paymentId },
      {
        onSuccess: (proof) => {
          window.open(proof.url, "_blank", "noopener,noreferrer");
        },
        onError: (error) => {
          toast.error(
            getApiErrorMessage(error, "Payment proof could not be opened"),
          );
        },
      },
    );
  };

  return (
    <CommunityPageShell>
      <CommunityHeader
        eyebrow="Events"
        title={event.title}
        subtitle={
          event.shortDescription ||
          (canSeePrivateDetails
            ? "Event details are available below."
            : "This is a private event. Details are limited until you are approved.")
        }
        action={<BackButton />}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge className="h-5 px-2 text-[11px]">
            {eventOptionLabel(event.type)}
          </Badge>
          <Badge variant="outline" className="h-5 px-2 text-[11px]">
            {titleCase(event.difficulty)}
          </Badge>
          <Badge variant="outline" className="h-5 px-2 text-[11px]">
            {event.visibility === "private" ? "Private" : "Public"}
          </Badge>
          <Badge variant="secondary" className="h-5 px-2 text-[11px]">
            {formatEventPriceLabel(event)}
          </Badge>
        </div>
      </CommunityHeader>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <DetailFact
          icon={<CalendarClock className="h-3.5 w-3.5" />}
          label="Schedule"
          value={formatEventDate(event.startsAt, event.endsAt, event.timezone)}
        />
        <DetailFact
          icon={<Users className="h-3.5 w-3.5" />}
          label="Capacity"
          value={`${event.currentAttendees}${event.capacity ? ` / ${event.capacity}` : ""} confirmed`}
        />
        <DetailFact
          icon={<Star className="h-3.5 w-3.5" />}
          label="Interest"
          value={`${event.interestedCount ?? 0} interested · ${event.goingCount ?? event.currentAttendees} going`}
        />
        <DetailFact
          icon={<MapPin className="h-3.5 w-3.5" />}
          label="Dive site"
          value={
            event.diveSite
              ? `${event.diveSite.name} · ${event.diveSite.area}`
              : event.location || "Dive site not shown"
          }
        />
        <DetailFact
          icon={
            event.visibility === "private" ? (
              <Lock className="h-3.5 w-3.5" />
            ) : (
              <Ticket className="h-3.5 w-3.5" />
            )
          }
          label="Join flow"
          value={event.requiresApproval ? "Approval required" : "Auto-confirm"}
        />
      </div>

      {!canSeePrivateDetails ? (
        <Card className="border-border/70 bg-muted/30 py-0">
          <CardContent className="flex items-start gap-2 p-3 text-sm text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Private event details, payment instructions, and attendee
              identities are hidden until the organizer approves participation.
            </span>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          {canSeePrivateDetails ? (
            <DetailSection title="Details">
              {event.descriptionMarkdown ? (
                <ChikaMarkdown content={event.descriptionMarkdown} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  The organizer has not added full details yet.
                </p>
              )}
            </DetailSection>
          ) : null}

          <DetailSection title="Event fit">
            <div className="divide-y divide-border/70 border-y border-border/70 text-sm">
              <DetailRow label="Type" value={eventOptionLabel(event.type)} />
              <DetailRow
                label="Difficulty"
                value={titleCase(event.difficulty)}
              />
              <DetailRow
                label="Beginner-friendly"
                value={event.beginnerFriendly ? "Yes" : "No"}
              />
              <DetailRow
                label="Max depth"
                value={event.maxDepthM ? `${event.maxDepthM}m` : "Not set"}
              />
              <DetailRow
                label="Entry type"
                value={event.entryType ? titleCase(event.entryType) : "Not set"}
              />
            </div>
          </DetailSection>

          {canSeePrivateDetails ? (
            <DetailSection title="Logistics">
              <div className="divide-y divide-border/70 border-y border-border/70 text-sm">
                <DetailRow
                  label="Meeting point"
                  value={event.meetingPoint || "Not set"}
                />
                <DetailRow
                  label="Equipment"
                  value={event.equipmentNotes || "Not set"}
                />
                <DetailRow
                  label="Safety"
                  value={event.safetyNotes || "Not set"}
                />
                <DetailRow
                  label="Cancellation"
                  value={event.cancellationPolicy || "Not set"}
                />
              </div>
            </DetailSection>
          ) : null}

          <ParticipantsSection
            event={event}
            participants={participants}
            isLoading={participantsQuery.isLoading}
            error={participantsQuery.error}
            onApprove={(participantId) =>
              approveParticipantMutation.mutate(
                { eventId: event.id, participantId },
                {
                  onSuccess: () => toast.success("Participant approved."),
                  onError: (error) =>
                    toast.error(
                      getApiErrorMessage(
                        error,
                        "Failed to approve participant",
                      ),
                    ),
                },
              )
            }
            onReject={(participantId) =>
              rejectParticipantMutation.mutate(
                { eventId: event.id, participantId },
                {
                  onSuccess: () => toast.success("Participant rejected."),
                  onError: (error) =>
                    toast.error(
                      getApiErrorMessage(error, "Failed to reject participant"),
                    ),
                },
              )
            }
            onVerifyPayment={(paymentId) =>
              verifyPaymentMutation.mutate(
                { eventId: event.id, paymentId },
                {
                  onSuccess: () => toast.success("Payment verified."),
                  onError: (error) =>
                    toast.error(
                      getApiErrorMessage(error, "Failed to verify payment"),
                    ),
                },
              )
            }
            onRejectPayment={(paymentId) =>
              rejectPaymentMutation.mutate(
                { eventId: event.id, paymentId },
                {
                  onSuccess: () => toast.success("Payment rejected."),
                  onError: (error) =>
                    toast.error(
                      getApiErrorMessage(error, "Failed to reject payment"),
                    ),
                },
              )
            }
            onViewPaymentProof={handleViewPaymentProof}
            viewingPaymentProofId={
              proofUrlMutation.isPending
                ? proofUrlMutation.variables?.paymentId
                : undefined
            }
          />
        </div>

        <div className="space-y-4">
          {event.viewerCanManage ? (
            <OrganizerSetupCard
              event={event}
              onSaved={() => {
                void eventQuery.refetch();
              }}
            />
          ) : null}

          <JoinCard
            event={event}
            isSignedIn={isSignedIn}
            joinNote={joinNote}
            setJoinNote={setJoinNote}
            onJoin={handleJoin}
            onLeave={handleLeave}
            onMarkInterested={handleMarkInterested}
            onMarkUninterested={handleMarkUninterested}
            isJoining={joinMutation.isPending}
            isLeaving={leaveMutation.isPending}
            isInterestPending={
              markInterestedMutation.isPending ||
              markUninterestedMutation.isPending
            }
          />

          {event.isPaid && event.viewerJoined ? (
            <PaymentCard
              event={event}
              paymentMethods={paymentMethods}
              selectedPaymentMethodId={selectedPaymentMethod?.id ?? ""}
              setSelectedPaymentMethodId={setSelectedPaymentMethodId}
              referenceNumber={referenceNumber}
              setReferenceNumber={setReferenceNumber}
              proofFile={proofFile}
              setProofFile={setProofFile}
              onSubmitPayment={handleSubmitPayment}
              isSubmitting={submitPaymentMutation.isPending || isUploadingProof}
              onViewPaymentProof={handleViewPaymentProof}
              isViewingProof={proofUrlMutation.isPending}
            />
          ) : null}
        </div>
      </div>
    </CommunityPageShell>
  );
}

function BackButton() {
  return (
    <Button size="sm" variant="outline" render={<Link href="/events" />}>
      <ArrowLeft className="mr-1 h-4 w-4" />
      Events
    </Button>
  );
}

function getViewerStateLabel(state: Event["viewerEventState"]) {
  switch (state) {
    case "interested":
      return "Interested";
    case "going":
      return "Going";
    case "pending_approval":
      return "Request pending";
    case "rejected":
      return "Rejected";
    case "left":
      return "Left";
    case "cancelled":
      return "Cancelled";
    default:
      return null;
  }
}

type OrganizerSetupEditor =
  | "description"
  | "capacity"
  | "payment"
  | "fit"
  | "logistics";

function OrganizerSetupCard({
  event,
  onSaved,
}: {
  event: Event;
  onSaved: () => void;
}) {
  const updateEventMutation = useUpdateEvent();
  const createPaymentMethodMutation = useCreateEventPaymentMethod();
  const [activeEditor, setActiveEditor] = useState<OrganizerSetupEditor | null>(
    null,
  );
  const [descriptionMarkdown, setDescriptionMarkdown] = useState(
    event.descriptionMarkdown ?? "",
  );
  const [capacity, setCapacity] = useState(
    event.capacity ? String(event.capacity) : "",
  );
  const [difficulty, setDifficulty] = useState<EventDifficulty>(
    event.difficulty,
  );
  const [beginnerFriendly, setBeginnerFriendly] = useState(
    event.beginnerFriendly,
  );
  const [maxDepthM, setMaxDepthM] = useState(
    event.maxDepthM ? String(event.maxDepthM) : "",
  );
  const [entryType, setEntryType] = useState<EventEntryType | "">(
    event.entryType ?? "",
  );
  const [meetingPoint, setMeetingPoint] = useState(event.meetingPoint ?? "");
  const [equipmentNotes, setEquipmentNotes] = useState(
    event.equipmentNotes ?? "",
  );
  const [safetyNotes, setSafetyNotes] = useState(event.safetyNotes ?? "");
  const [cancellationPolicy, setCancellationPolicy] = useState(
    event.cancellationPolicy ?? "",
  );
  const [priceAmount, setPriceAmount] = useState(
    event.priceAmount != null ? String(event.priceAmount) : "",
  );
  const [currency, setCurrency] = useState(event.currency || "PHP");
  const [paymentInstructions, setPaymentInstructions] = useState(
    event.paymentInstructions ?? "",
  );
  const [paymentMethodType, setPaymentMethodType] =
    useState<EventPaymentMethodType>("MANUAL_QR");
  const [paymentMethodName, setPaymentMethodName] = useState("");
  const [paymentMethodInstructions, setPaymentMethodInstructions] =
    useState("");
  const [qrImageUrl, setQrImageUrl] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");

  const activePaymentMethods = (event.paymentMethods ?? []).filter(
    (method) => method.isActive,
  );
  const isSaving =
    updateEventMutation.isPending || createPaymentMethodMutation.isPending;

  const savePatch = (data: UpdateEventRequest, successMessage: string) => {
    updateEventMutation.mutate(
      { eventId: event.id, data },
      {
        onSuccess: () => {
          toast.success(successMessage);
          setActiveEditor(null);
          onSaved();
        },
        onError: (error) => {
          toast.error(getApiErrorMessage(error, "Failed to update event"));
        },
      },
    );
  };

  const saveDescription = () => {
    const value = descriptionMarkdown.trim();
    if (!value) {
      toast.error("Full description is required before saving.");
      return;
    }
    savePatch({ descriptionMarkdown: value }, "Description saved.");
  };

  const saveCapacity = () => {
    const value = Number.parseInt(capacity, 10);
    if (!Number.isFinite(value) || value < 1) {
      toast.error("Capacity must be at least 1.");
      return;
    }
    savePatch({ capacity: value }, "Capacity saved.");
  };

  const saveFit = () => {
    const maxDepth = maxDepthM.trim()
      ? Number.parseInt(maxDepthM.trim(), 10)
      : undefined;
    if (
      maxDepth !== undefined &&
      (!Number.isFinite(maxDepth) || maxDepth < 0)
    ) {
      toast.error("Max depth must be zero or higher.");
      return;
    }
    savePatch(
      {
        beginnerFriendly,
        difficulty,
        entryType: (entryType || "") as EventEntryType,
        maxDepthM: maxDepth,
      },
      "Freediving details saved.",
    );
  };

  const saveLogistics = () => {
    savePatch(
      {
        meetingPoint: meetingPoint.trim(),
        equipmentNotes: equipmentNotes.trim(),
        safetyNotes: safetyNotes.trim(),
        cancellationPolicy: cancellationPolicy.trim(),
      },
      "Safety and logistics saved.",
    );
  };

  const savePayment = () => {
    const trimmedPrice = priceAmount.trim();
    const parsedPrice = trimmedPrice
      ? Number.parseFloat(trimmedPrice)
      : undefined;
    const methodName = paymentMethodName.trim();
    const hasMethodDraft =
      methodName ||
      paymentMethodInstructions.trim() ||
      qrImageUrl.trim() ||
      bankName.trim() ||
      accountName.trim() ||
      accountNumber.trim();

    if (
      parsedPrice !== undefined &&
      (!Number.isFinite(parsedPrice) || parsedPrice < 0)
    ) {
      toast.error("Price must be zero or higher.");
      return;
    }
    if (activePaymentMethods.length === 0 && !methodName) {
      toast.error("Add a payment method name before saving payment setup.");
      return;
    }
    if (hasMethodDraft && !methodName) {
      toast.error("Payment method name is required.");
      return;
    }

    updateEventMutation.mutate(
      {
        eventId: event.id,
        data: {
          isPaid: true,
          priceAmount: parsedPrice,
          currency: currency.trim().toUpperCase() || "PHP",
          paymentInstructions: paymentInstructions.trim(),
        },
      },
      {
        onSuccess: () => {
          if (!methodName) {
            toast.success("Payment setup saved.");
            setActiveEditor(null);
            onSaved();
            return;
          }
          createPaymentMethodMutation.mutate(
            {
              eventId: event.id,
              data: {
                type: paymentMethodType,
                name: methodName,
                instructions: paymentMethodInstructions.trim() || undefined,
                qrImageUrl:
                  paymentMethodType === "MANUAL_QR"
                    ? qrImageUrl.trim() || undefined
                    : undefined,
                bankName:
                  paymentMethodType === "MANUAL_BANK_TRANSFER"
                    ? bankName.trim() || undefined
                    : undefined,
                accountName:
                  paymentMethodType === "MANUAL_BANK_TRANSFER"
                    ? accountName.trim() || undefined
                    : undefined,
                accountNumber:
                  paymentMethodType === "MANUAL_BANK_TRANSFER"
                    ? accountNumber.trim() || undefined
                    : undefined,
                isActive: true,
              },
            },
            {
              onSuccess: () => {
                toast.success("Payment setup saved.");
                setActiveEditor(null);
                setPaymentMethodName("");
                setPaymentMethodInstructions("");
                setQrImageUrl("");
                setBankName("");
                setAccountName("");
                setAccountNumber("");
                onSaved();
              },
              onError: (error) => {
                toast.error(
                  getApiErrorMessage(error, "Failed to add payment method"),
                );
              },
            },
          );
        },
        onError: (error) => {
          toast.error(
            getApiErrorMessage(error, "Failed to update payment setup"),
          );
        },
      },
    );
  };

  return (
    <Card className="py-0">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-base">Organizer setup</CardTitle>
        <p className="text-xs leading-5 text-muted-foreground">
          Complete advanced details after the event exists.
        </p>
      </CardHeader>
      <CardContent className="space-y-2 p-4 pt-0">
        <SetupRow
          title="Full description"
          status={event.descriptionMarkdown ? "Added" : "Missing"}
          actionLabel={event.descriptionMarkdown ? "Edit" : "Add"}
          isOpen={activeEditor === "description"}
          onToggle={() =>
            setActiveEditor(
              activeEditor === "description" ? null : "description",
            )
          }
        >
          <SetupField label="Full description">
            <Textarea
              className="min-h-28"
              value={descriptionMarkdown}
              onChange={(item) => setDescriptionMarkdown(item.target.value)}
              placeholder="Schedule, inclusions, what to bring, and organizer notes"
            />
          </SetupField>
          <SetupActions
            isSaving={isSaving}
            onCancel={() => setActiveEditor(null)}
            onSave={saveDescription}
          />
        </SetupRow>

        <SetupRow
          title="Capacity"
          status={event.capacity ? `${event.capacity} spots` : "Not set"}
          actionLabel={event.capacity ? "Edit" : "Set"}
          isOpen={activeEditor === "capacity"}
          onToggle={() =>
            setActiveEditor(activeEditor === "capacity" ? null : "capacity")
          }
        >
          <SetupField label="Capacity">
            <Input
              type="number"
              min={1}
              value={capacity}
              onChange={(item) => setCapacity(item.target.value)}
              placeholder="8"
            />
          </SetupField>
          <SetupActions
            isSaving={isSaving}
            onCancel={() => setActiveEditor(null)}
            onSave={saveCapacity}
          />
        </SetupRow>

        <SetupRow
          title="Payment setup"
          status={getPaymentSetupStatus(event, activePaymentMethods.length)}
          actionLabel={event.isPaid ? "Manage" : "Set paid"}
          isOpen={activeEditor === "payment"}
          onToggle={() =>
            setActiveEditor(activeEditor === "payment" ? null : "payment")
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <SetupField label="Price">
              <Input
                type="number"
                min={0}
                step="0.01"
                value={priceAmount}
                onChange={(item) => setPriceAmount(item.target.value)}
                placeholder="1500"
              />
            </SetupField>
            <SetupField label="Currency">
              <Input
                value={currency}
                onChange={(item) => setCurrency(item.target.value)}
                placeholder="PHP"
              />
            </SetupField>
          </div>
          <SetupField label="Payment instructions">
            <Textarea
              className="min-h-20"
              value={paymentInstructions}
              onChange={(item) => setPaymentInstructions(item.target.value)}
              placeholder="Tell participants when and how to pay."
            />
          </SetupField>
          <div className="rounded-lg border border-border/70 p-3">
            <p className="text-sm font-medium text-foreground">
              Add payment method
            </p>
            {activePaymentMethods.length > 0 ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Existing active methods:{" "}
                {activePaymentMethods.map((method) => method.name).join(", ")}
              </p>
            ) : null}
            <div className="mt-3 grid gap-3">
              <SetupField label="Type">
                <Select
                  value={paymentMethodType}
                  onValueChange={(value) =>
                    setPaymentMethodType(value as EventPaymentMethodType)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MANUAL_QR">QR payment</SelectItem>
                    <SelectItem value="MANUAL_BANK_TRANSFER">
                      Bank transfer
                    </SelectItem>
                  </SelectContent>
                </Select>
              </SetupField>
              <SetupField label="Name">
                <Input
                  value={paymentMethodName}
                  onChange={(item) => setPaymentMethodName(item.target.value)}
                  placeholder={
                    paymentMethodType === "MANUAL_QR" ? "GCash" : "BPI"
                  }
                />
              </SetupField>
              <SetupField label="Instructions">
                <Textarea
                  className="min-h-16"
                  value={paymentMethodInstructions}
                  onChange={(item) =>
                    setPaymentMethodInstructions(item.target.value)
                  }
                />
              </SetupField>
              {paymentMethodType === "MANUAL_QR" ? (
                <SetupField label="QR image URL">
                  <Input
                    value={qrImageUrl}
                    onChange={(item) => setQrImageUrl(item.target.value)}
                    placeholder="https://..."
                  />
                </SetupField>
              ) : (
                <div className="grid gap-3">
                  <SetupField label="Bank name">
                    <Input
                      value={bankName}
                      onChange={(item) => setBankName(item.target.value)}
                      placeholder="BPI"
                    />
                  </SetupField>
                  <SetupField label="Account name">
                    <Input
                      value={accountName}
                      onChange={(item) => setAccountName(item.target.value)}
                    />
                  </SetupField>
                  <SetupField label="Account number">
                    <Input
                      value={accountNumber}
                      onChange={(item) => setAccountNumber(item.target.value)}
                    />
                  </SetupField>
                </div>
              )}
            </div>
          </div>
          <SetupActions
            isSaving={isSaving}
            onCancel={() => setActiveEditor(null)}
            onSave={savePayment}
          />
        </SetupRow>

        <SetupRow
          title="Freediving details"
          status={getFitStatus(event)}
          actionLabel="Edit"
          isOpen={activeEditor === "fit"}
          onToggle={() =>
            setActiveEditor(activeEditor === "fit" ? null : "fit")
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <SetupField label="Difficulty">
              <Select
                value={difficulty}
                onValueChange={(value) =>
                  setDifficulty(value as EventDifficulty)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {difficultyOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SetupField>
            <SetupField label="Entry type">
              <Select
                value={entryType || "none"}
                onValueChange={(value) =>
                  setEntryType(
                    value === "none" ? "" : (value as EventEntryType),
                  )
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not set</SelectItem>
                  {entryTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SetupField>
          </div>
          <SetupField label="Max depth (m)">
            <Input
              type="number"
              min={0}
              value={maxDepthM}
              onChange={(item) => setMaxDepthM(item.target.value)}
            />
          </SetupField>
          <label className="flex items-start gap-2 text-sm">
            <input
              className="mt-1"
              type="checkbox"
              checked={beginnerFriendly}
              onChange={(item) => setBeginnerFriendly(item.target.checked)}
            />
            Beginner-friendly
          </label>
          <SetupActions
            isSaving={isSaving}
            onCancel={() => setActiveEditor(null)}
            onSave={saveFit}
          />
        </SetupRow>

        <SetupRow
          title="Safety and logistics"
          status={getLogisticsStatus(event)}
          actionLabel="Edit"
          isOpen={activeEditor === "logistics"}
          onToggle={() =>
            setActiveEditor(activeEditor === "logistics" ? null : "logistics")
          }
        >
          <SetupField label="Meeting point">
            <Input
              value={meetingPoint}
              onChange={(item) => setMeetingPoint(item.target.value)}
              placeholder="Resort lobby, pier, or pool entrance"
            />
          </SetupField>
          <SetupField label="Equipment notes">
            <Textarea
              className="min-h-20"
              value={equipmentNotes}
              onChange={(item) => setEquipmentNotes(item.target.value)}
            />
          </SetupField>
          <SetupField label="Safety notes">
            <Textarea
              className="min-h-20"
              value={safetyNotes}
              onChange={(item) => setSafetyNotes(item.target.value)}
            />
          </SetupField>
          <SetupField label="Cancellation policy">
            <Textarea
              className="min-h-20"
              value={cancellationPolicy}
              onChange={(item) => setCancellationPolicy(item.target.value)}
            />
          </SetupField>
          <SetupActions
            isSaving={isSaving}
            onCancel={() => setActiveEditor(null)}
            onSave={saveLogistics}
          />
        </SetupRow>
      </CardContent>
    </Card>
  );
}

function SetupRow({
  title,
  status,
  actionLabel,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  status: string;
  actionLabel: string;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border/70">
      <div className="flex items-center justify-between gap-3 p-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{status}</p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={onToggle}>
          {isOpen ? "Close" : actionLabel}
        </Button>
      </div>
      {isOpen ? (
        <div className="space-y-3 border-t border-border/70 p-3">
          {children}
        </div>
      ) : null}
    </div>
  );
}

function SetupField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}

function SetupActions({
  isSaving,
  onCancel,
  onSave,
}: {
  isSaving: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={isSaving}
        onClick={onCancel}
      >
        Cancel
      </Button>
      <Button type="button" size="sm" disabled={isSaving} onClick={onSave}>
        {isSaving ? "Saving..." : "Save"}
      </Button>
    </div>
  );
}

function formatEventPriceLabel(event: Event) {
  if (!event.isPaid) return "Free";
  if (event.priceAmount == null) return "Paid";
  return `${event.currency} ${event.priceAmount}`;
}

function getPaymentSetupStatus(event: Event, activePaymentMethodCount: number) {
  if (!event.isPaid) return "Not paid";
  if (activePaymentMethodCount === 0) return "Payment setup incomplete";
  if (event.priceAmount == null) return "Amount pending";
  return "Ready";
}

function getFitStatus(event: Event) {
  const parts = [
    titleCase(event.difficulty),
    event.entryType ? titleCase(event.entryType) : "",
    event.maxDepthM ? `${event.maxDepthM}m` : "",
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "Not set";
}

function getLogisticsStatus(event: Event) {
  const completed = [
    event.meetingPoint,
    event.equipmentNotes,
    event.safetyNotes,
    event.cancellationPolicy,
  ].filter(Boolean).length;
  return completed > 0 ? `${completed} of 4 added` : "Missing";
}

function JoinCard({
  event,
  isSignedIn,
  joinNote,
  setJoinNote,
  onJoin,
  onLeave,
  onMarkInterested,
  onMarkUninterested,
  isJoining,
  isLeaving,
  isInterestPending,
}: {
  event: Event;
  isSignedIn: boolean;
  joinNote: string;
  setJoinNote: (value: string) => void;
  onJoin: () => void;
  onLeave: () => void;
  onMarkInterested: () => void;
  onMarkUninterested: () => void;
  isJoining: boolean;
  isLeaving: boolean;
  isInterestPending: boolean;
}) {
  const viewerState = event.viewerEventState ?? "none";
  const canToggleInterest =
    isSignedIn &&
    event.status === "published" &&
    ["none", "interested", "rejected", "left", "cancelled"].includes(
      viewerState,
    );
  const canJoin = !event.viewerParticipation;
  const stateLabel = getViewerStateLabel(viewerState);

  return (
    <Card className="py-0">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-base">Participation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4 pt-0">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="h-6 px-2">
            {event.interestedCount ?? 0} interested
          </Badge>
          <Badge variant="outline" className="h-6 px-2">
            {event.goingCount ?? event.currentAttendees} going
          </Badge>
          {stateLabel ? (
            <Badge variant="secondary" className="h-6 px-2">
              {stateLabel}
            </Badge>
          ) : null}
        </div>

        {event.viewerParticipation ? (
          <div className="rounded-lg border border-border/70 p-3 text-sm">
            <p className="font-medium">
              {stateLabel ?? titleCase(event.viewerParticipation.status)}
            </p>
            <p className="mt-1 text-muted-foreground">
              Payment status:{" "}
              {titleCase(event.viewerPayment?.status ?? "not_required")}
            </p>
          </div>
        ) : null}

        {!isSignedIn ? (
          <SignInButton mode="modal">
            <Button className="w-full">
              Sign in to join or mark interested
            </Button>
          </SignInButton>
        ) : (
          <>
            {canToggleInterest ? (
              viewerState === "interested" ? (
                <Button
                  className="w-full"
                  variant="outline"
                  disabled={isInterestPending}
                  onClick={onMarkUninterested}
                >
                  Remove interest
                </Button>
              ) : (
                <Button
                  className="w-full"
                  variant="outline"
                  disabled={isInterestPending}
                  onClick={onMarkInterested}
                >
                  Interested
                </Button>
              )
            ) : null}

            {event.viewerJoined ? (
              <Button
                className="w-full"
                variant="outline"
                disabled={
                  isLeaving || event.viewerParticipation?.role === "organizer"
                }
                onClick={onLeave}
              >
                Leave event
              </Button>
            ) : canJoin ? (
              <>
                <Label htmlFor="join-note">Message to organizer</Label>
                <Textarea
                  id="join-note"
                  className="min-h-24"
                  value={joinNote}
                  onChange={(event) => setJoinNote(event.target.value)}
                  placeholder="Optional note, experience level, or question"
                />
                <Button
                  className="w-full"
                  disabled={isJoining || event.status !== "published"}
                  onClick={onJoin}
                >
                  {event.requiresApproval ? "Request to join" : "Join event"}
                </Button>
              </>
            ) : (
              <p className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">
                This participation record is closed. Ask the organizer to
                reactivate it if needed.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function PaymentCard({
  event,
  paymentMethods,
  selectedPaymentMethodId,
  setSelectedPaymentMethodId,
  referenceNumber,
  setReferenceNumber,
  proofFile,
  setProofFile,
  onSubmitPayment,
  isSubmitting,
  onViewPaymentProof,
  isViewingProof,
}: {
  event: Event;
  paymentMethods: EventPaymentMethod[];
  selectedPaymentMethodId: string;
  setSelectedPaymentMethodId: (value: string) => void;
  referenceNumber: string;
  setReferenceNumber: (value: string) => void;
  proofFile: File | null;
  setProofFile: (value: File | null) => void;
  onSubmitPayment: () => void;
  isSubmitting: boolean;
  onViewPaymentProof: (paymentId: string) => void;
  isViewingProof: boolean;
}) {
  const payment = event.viewerPayment;
  return (
    <Card className="py-0">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-base">Payment</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4 pt-0">
        <div className="rounded-lg border border-border/70 p-3 text-sm">
          <p className="font-medium">
            {event.priceAmount == null
              ? "Payment amount pending"
              : `${event.currency} ${event.priceAmount}`}
          </p>
          <p className="mt-1 text-muted-foreground">
            Status: {titleCase(payment?.status ?? "pending_upload")}
          </p>
          {payment?.proofMediaId ? (
            <Button
              className="mt-2 h-8 px-2 text-xs"
              size="sm"
              variant="outline"
              disabled={isViewingProof}
              onClick={() => onViewPaymentProof(payment.id)}
            >
              {isViewingProof ? "Opening..." : "View submitted proof"}
            </Button>
          ) : null}
        </div>
        {event.paymentInstructions ? (
          <p className="text-sm leading-6 text-muted-foreground">
            {event.paymentInstructions}
          </p>
        ) : null}
        {paymentMethods.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Payment setup is not ready yet. Check back after the organizer adds
            payment details.
          </p>
        ) : (
          <>
            <Label>Payment method</Label>
            <Select
              value={selectedPaymentMethodId || paymentMethods[0]?.id}
              onValueChange={(value) => {
                if (value) setSelectedPaymentMethodId(value);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.map((method) => (
                  <SelectItem key={method.id} value={method.id}>
                    {method.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <PaymentMethodDetails
              method={
                paymentMethods.find(
                  (method) => method.id === selectedPaymentMethodId,
                ) ?? paymentMethods[0]
              }
            />
            <Label htmlFor="payment-reference">Reference number</Label>
            <Input
              id="payment-reference"
              value={referenceNumber}
              onChange={(event) => setReferenceNumber(event.target.value)}
              placeholder="Optional transaction reference"
            />
            <Label htmlFor="payment-proof">Proof of payment</Label>
            <Input
              id="payment-proof"
              type="file"
              accept="image/*"
              onChange={(event) =>
                setProofFile(event.target.files?.[0] ?? null)
              }
            />
            {proofFile ? (
              <p className="text-xs text-muted-foreground">{proofFile.name}</p>
            ) : null}
            <Button
              className="w-full"
              disabled={isSubmitting || !proofFile}
              onClick={onSubmitPayment}
            >
              Submit proof
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function PaymentMethodDetails({ method }: { method?: EventPaymentMethod }) {
  if (!method) return null;
  return (
    <div className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">
      <p className="font-medium text-foreground">{method.name}</p>
      {method.instructions ? (
        <p className="mt-1">{method.instructions}</p>
      ) : null}
      {method.type === "MANUAL_BANK_TRANSFER" ? (
        <div className="mt-2 grid gap-1">
          {method.bankName ? <span>Bank: {method.bankName}</span> : null}
          {method.accountName ? <span>Name: {method.accountName}</span> : null}
          {method.accountNumber ? (
            <span>Account: {method.accountNumber}</span>
          ) : null}
        </div>
      ) : method.qrImageUrl ? (
        <a
          className="mt-2 inline-block text-primary underline underline-offset-4"
          href={method.qrImageUrl}
          target="_blank"
          rel="noreferrer"
        >
          Open QR
        </a>
      ) : null}
    </div>
  );
}

function ParticipantsSection({
  event,
  participants,
  isLoading,
  error,
  onApprove,
  onReject,
  onVerifyPayment,
  onRejectPayment,
  onViewPaymentProof,
  viewingPaymentProofId,
}: {
  event: Event;
  participants: EventParticipant[];
  isLoading: boolean;
  error: unknown;
  onApprove: (participantId: string) => void;
  onReject: (participantId: string) => void;
  onVerifyPayment: (paymentId: string) => void;
  onRejectPayment: (paymentId: string) => void;
  onViewPaymentProof: (paymentId: string) => void;
  viewingPaymentProofId?: string;
}) {
  const canShowIdentities =
    event.visibility === "public" ||
    event.viewerCanViewPrivateDetails ||
    event.viewerCanManage;

  if (!canShowIdentities) {
    return (
      <DetailSection title="Participants">
        <p className="text-sm text-muted-foreground">
          {event.currentAttendees} confirmed participant
          {event.currentAttendees === 1 ? "" : "s"}. Identities are hidden for
          private events.
        </p>
      </DetailSection>
    );
  }

  return (
    <DetailSection
      title={
        event.viewerCanManage ? "Participants and payments" : "Participants"
      }
    >
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">
          {getApiErrorMessage(error, "Participants could not be loaded.")}
        </p>
      ) : participants.length === 0 ? (
        <CommunityEmptyState
          title="No participants yet"
          description="Participant records will appear here after divers join."
        />
      ) : (
        <div className="divide-y divide-border/70 border-y border-border/70">
          {participants.map((participant) => (
            <div key={participant.id} className="space-y-3 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <UserIdentityHeader
                  displayName={
                    participant.displayName ||
                    participant.username ||
                    participant.userId
                  }
                  username={participant.username}
                  avatarUrl={participant.avatarUrl ?? undefined}
                  usernameFallback="participant"
                />
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline" className="h-5 px-2 text-[11px]">
                    {titleCase(participant.status)}
                  </Badge>
                  <Badge variant="outline" className="h-5 px-2 text-[11px]">
                    {titleCase(participant.role)}
                  </Badge>
                </div>
              </div>
              {participant.participantNote ? (
                <p className="rounded-lg bg-muted/40 p-2 text-sm text-muted-foreground">
                  {participant.participantNote}
                </p>
              ) : null}
              {event.viewerCanManage ? (
                <OrganizerActions
                  participant={participant}
                  onApprove={onApprove}
                  onReject={onReject}
                  onVerifyPayment={onVerifyPayment}
                  onRejectPayment={onRejectPayment}
                  onViewPaymentProof={onViewPaymentProof}
                  viewingPaymentProofId={viewingPaymentProofId}
                />
              ) : null}
            </div>
          ))}
        </div>
      )}
    </DetailSection>
  );
}

function OrganizerActions({
  participant,
  onApprove,
  onReject,
  onVerifyPayment,
  onRejectPayment,
  onViewPaymentProof,
  viewingPaymentProofId,
}: {
  participant: EventParticipant;
  onApprove: (participantId: string) => void;
  onReject: (participantId: string) => void;
  onVerifyPayment: (paymentId: string) => void;
  onRejectPayment: (paymentId: string) => void;
  onViewPaymentProof: (paymentId: string) => void;
  viewingPaymentProofId?: string;
}) {
  const payment = participant.payment;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {participant.status === "pending_approval" ? (
        <>
          <Button size="sm" onClick={() => onApprove(participant.id)}>
            <CheckCircle2 className="mr-1 h-4 w-4" />
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onReject(participant.id)}
          >
            <XCircle className="mr-1 h-4 w-4" />
            Reject
          </Button>
        </>
      ) : null}
      {payment ? (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>Payment: {titleCase(payment.status)}</span>
          {payment.proofMediaId ? (
            <Button
              size="sm"
              variant="outline"
              disabled={viewingPaymentProofId === payment.id}
              onClick={() => onViewPaymentProof(payment.id)}
            >
              {viewingPaymentProofId === payment.id
                ? "Opening..."
                : "View proof"}
            </Button>
          ) : null}
          {payment.referenceNumber ? (
            <span>Ref: {payment.referenceNumber}</span>
          ) : null}
          {payment.status === "submitted" ? (
            <>
              <Button size="sm" onClick={() => onVerifyPayment(payment.id)}>
                Verify payment
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onRejectPayment(payment.id)}
              >
                Reject payment
              </Button>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function DetailFact({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/75 px-3 py-2">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-xl border border-border/70 bg-background/70 p-3">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 py-2.5 sm:grid-cols-[11rem_1fr]">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

function formatEventDate(start?: string, end?: string, timezone?: string) {
  const startDate = start ? new Date(start) : null;
  const endDate = end ? new Date(end) : null;
  if (!startDate || Number.isNaN(startDate.getTime())) {
    return "Schedule not set";
  }
  const formatter = new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone || "Asia/Manila",
  });
  if (!endDate || Number.isNaN(endDate.getTime())) {
    return formatter.format(startDate);
  }
  return `${formatter.format(startDate)} to ${formatter.format(endDate)}`;
}

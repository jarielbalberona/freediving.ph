"use client";

import { SignInButton } from "@clerk/nextjs";
import type {
  Event,
  EventDifficulty,
  EventEntryType,
  EventParticipant,
  EventPaymentMethod,
  EventPaymentMethodType,
  EventPaymentStatus,
  EventVisibility,
  UpdateEventRequest,
} from "@freediving.ph/types";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Lock,
  MapPin,
  Pencil,
  ShieldCheck,
  Ticket,
  Upload,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/features/auth/session";
import { ChikaMarkdown } from "@/features/chika/components/ChikaMarkdown";
import { DiveSiteCombobox } from "@/features/diveSpots/components/DiveSiteCombobox";
import {
  difficultyOptions,
  entryTypeOptions,
  eventOptionLabel,
  titleCase,
  useApproveEventParticipant,
  useCreateEventPaymentMethod,
  useEvent,
  useEventParticipants,
  useEventPaymentProofUrl,
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

type EventTab = "overview" | "join" | "participants" | "payment" | "manage";

const eventTabsListClassName =
  "no-scrollbar -mx-3 w-[calc(100%+1.5rem)] justify-start overflow-x-auto rounded-none bg-transparent px-3 pb-1 sm:mx-0 sm:w-full sm:px-0";
const eventTabTriggerClassName =
  "h-8 flex-none rounded-full border-border/70 px-3 text-xs data-active:border-border data-active:bg-background data-active:shadow-xs";

export default function EventDetailClient({ slug }: { slug: string }) {
  const session = useSession();
  const isSignedIn = session.status === "signed_in";
  const [activeTab, setActiveTab] = useState<EventTab>("overview");
  const [joinNote, setJoinNote] = useState("");
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

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
          title="Opening event"
          subtitle="Loading schedule, dive site, and participation state."
          navigation={<BackButton />}
        />
        <div className="space-y-3">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-44 w-full rounded-xl" />
        </div>
      </CommunityPageShell>
    );
  }

  if (eventQuery.error || !event) {
    return (
      <CommunityPageShell>
        <CommunityHeader
          title="Event unavailable"
          subtitle="This event is taking longer than expected to open."
          navigation={<BackButton />}
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
  const canShowJoinTab =
    !event.viewerCanManage &&
    (isSignedIn || event.viewerEventState !== "anonymous");
  const canShowParticipantsTab =
    event.visibility === "public" ||
    event.viewerCanViewPrivateDetails ||
    event.viewerCanManage;
  const canShowPaymentTab =
    event.isPaid && (event.viewerJoined || event.viewerCanManage);
  const canShowManageTab = event.viewerCanManage;
  const visibleTabs: EventTab[] = [
    "overview",
    ...(canShowJoinTab ? (["join"] as const) : []),
    ...(canShowParticipantsTab ? (["participants"] as const) : []),
    ...(canShowPaymentTab ? (["payment"] as const) : []),
    ...(canShowManageTab ? (["manage"] as const) : []),
  ];
  const currentTab = visibleTabs.includes(activeTab) ? activeTab : "overview";

  const handleJoin = () => {
    joinMutation.mutate(
      { eventId, participantNote: joinNote.trim() || undefined },
      {
        onSuccess: (participant) => {
          setJoinNote("");
          setJoinDialogOpen(false);
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
            setPaymentDialogOpen(false);
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
      <EventHeader
        event={event}
        canSeePrivateDetails={canSeePrivateDetails}
        canShowJoinTab={canShowJoinTab}
        canShowManageTab={canShowManageTab}
        canShowPaymentTab={canShowPaymentTab}
        isSignedIn={isSignedIn}
        onSelectTab={setActiveTab}
      />

      {!canSeePrivateDetails ? (
        <PrivacyNotice>
          Private event details, payment instructions, and attendee identities
          are hidden until the organizer approves participation.
        </PrivacyNotice>
      ) : null}

      <Tabs
        value={currentTab}
        onValueChange={(value) => setActiveTab(value as EventTab)}
        className="gap-4"
      >
        <TabsList className={eventTabsListClassName}>
          <TabsTrigger
            value="overview"
            className={eventTabTriggerClassName}
            onClick={() => setActiveTab("overview")}
          >
            Overview
          </TabsTrigger>
          {canShowJoinTab ? (
            <TabsTrigger
              value="join"
              className={eventTabTriggerClassName}
              onClick={() => setActiveTab("join")}
            >
              Join
            </TabsTrigger>
          ) : null}
          {canShowParticipantsTab ? (
            <TabsTrigger
              value="participants"
              className={eventTabTriggerClassName}
              onClick={() => setActiveTab("participants")}
            >
              Participants
            </TabsTrigger>
          ) : null}
          {canShowPaymentTab ? (
            <TabsTrigger
              value="payment"
              className={eventTabTriggerClassName}
              onClick={() => setActiveTab("payment")}
            >
              Payment
            </TabsTrigger>
          ) : null}
          {canShowManageTab ? (
            <TabsTrigger
              value="manage"
              className={eventTabTriggerClassName}
              onClick={() => setActiveTab("manage")}
            >
              Manage
            </TabsTrigger>
          ) : null}
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <OverviewTab
            event={event}
            canSeePrivateDetails={canSeePrivateDetails}
          />
        </TabsContent>

        {canShowJoinTab ? (
          <TabsContent value="join" className="space-y-4">
            <JoinTab
              event={event}
              isSignedIn={isSignedIn}
              joinNote={joinNote}
              setJoinNote={setJoinNote}
              joinDialogOpen={joinDialogOpen}
              setJoinDialogOpen={setJoinDialogOpen}
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
          </TabsContent>
        ) : null}

        {canShowParticipantsTab ? (
          <TabsContent value="participants" className="space-y-4">
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
          </TabsContent>
        ) : null}

        {canShowPaymentTab ? (
          <TabsContent value="payment" className="space-y-4">
            <PaymentTab
              event={event}
              paymentMethods={paymentMethods}
              selectedPaymentMethodId={selectedPaymentMethod?.id ?? ""}
              setSelectedPaymentMethodId={setSelectedPaymentMethodId}
              referenceNumber={referenceNumber}
              setReferenceNumber={setReferenceNumber}
              proofFile={proofFile}
              setProofFile={setProofFile}
              paymentDialogOpen={paymentDialogOpen}
              setPaymentDialogOpen={setPaymentDialogOpen}
              onSubmitPayment={handleSubmitPayment}
              isSubmitting={submitPaymentMutation.isPending || isUploadingProof}
              onViewPaymentProof={handleViewPaymentProof}
              viewingPaymentProofId={
                proofUrlMutation.isPending
                  ? proofUrlMutation.variables?.paymentId
                  : undefined
              }
              onManagePayment={() => setActiveTab("manage")}
            />
          </TabsContent>
        ) : null}

        {canShowManageTab ? (
          <TabsContent value="manage" className="space-y-4">
            <OrganizerManageTab
              event={event}
              onSaved={() => {
                void eventQuery.refetch();
              }}
            />
          </TabsContent>
        ) : null}
      </Tabs>
    </CommunityPageShell>
  );
}

function BackButton() {
  return (
    <Button
      size="sm"
      variant="outline"
      nativeButton={false}
      render={<Link href="/events" />}
    >
      <ArrowLeft className="mr-1 h-4 w-4" />
      Events
    </Button>
  );
}

function EventHeader({
  event,
  canSeePrivateDetails,
  canShowJoinTab,
  canShowManageTab,
  canShowPaymentTab,
  isSignedIn,
  onSelectTab,
}: {
  event: Event;
  canSeePrivateDetails: boolean;
  canShowJoinTab: boolean;
  canShowManageTab: boolean;
  canShowPaymentTab: boolean;
  isSignedIn: boolean;
  onSelectTab: (tab: EventTab) => void;
}) {
  const subtitle =
    event.shortDescription ||
    (canSeePrivateDetails
      ? "Details from the organizer are below."
      : "This is a private event. Details are limited until you are approved.");
  const chips = [
    eventOptionLabel(event.type),
    titleCase(event.difficulty),
    event.visibility === "private" ? "Private" : "Public",
    formatEventPriceLabel(event),
  ];

  return (
    <CommunityHeader
      title={event.title}
      subtitle={subtitle}
      navigation={<BackButton />}
      action={
        <HeaderAction
          event={event}
          canShowJoinTab={canShowJoinTab}
          canShowManageTab={canShowManageTab}
          canShowPaymentTab={canShowPaymentTab}
          isSignedIn={isSignedIn}
          onSelectTab={onSelectTab}
        />
      }
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {chips.map((chip, index) => (
            <Badge
              key={`${chip}-${index}`}
              variant={index === 0 ? "default" : "outline"}
              className="h-6 px-2 text-[11px]"
            >
              {chip}
            </Badge>
          ))}
        </div>
        <div className="grid gap-2 text-sm text-muted-foreground">
          <MetaLine icon={<CalendarClock className="h-4 w-4" />}>
            {formatEventDate(event.startsAt, event.endsAt, event.timezone)}
          </MetaLine>
          <MetaLine icon={<MapPin className="h-4 w-4" />}>
            {formatEventLocation(event)}
          </MetaLine>
          <MetaLine icon={<Users className="h-4 w-4" />}>
            {event.goingCount ?? event.currentAttendees} going ·{" "}
            {event.interestedCount ?? 0} interested
            {event.capacity ? ` · ${event.capacity} spots` : ""}
          </MetaLine>
          <MetaLine
            icon={
              event.visibility === "private" ? (
                <Lock className="h-4 w-4" />
              ) : (
                <Ticket className="h-4 w-4" />
              )
            }
          >
            {event.requiresApproval ? "Approval required" : "Auto-confirm"}
          </MetaLine>
        </div>
      </div>
    </CommunityHeader>
  );
}

function HeaderAction({
  event,
  canShowJoinTab,
  canShowManageTab,
  canShowPaymentTab,
  isSignedIn,
  onSelectTab,
}: {
  event: Event;
  canShowJoinTab: boolean;
  canShowManageTab: boolean;
  canShowPaymentTab: boolean;
  isSignedIn: boolean;
  onSelectTab: (tab: EventTab) => void;
}) {
  if (canShowManageTab) {
    return (
      <Button size="sm" onClick={() => onSelectTab("manage")}>
        <Pencil className="mr-1 h-4 w-4" />
        Manage
      </Button>
    );
  }

  if (!isSignedIn) {
    return (
      <SignInButton mode="modal">
        <Button size="sm">Sign in</Button>
      </SignInButton>
    );
  }

  if (canShowPaymentTab && event.viewerPayment?.status === "pending_upload") {
    return (
      <Button size="sm" onClick={() => onSelectTab("payment")}>
        <Upload className="mr-1 h-4 w-4" />
        Upload proof
      </Button>
    );
  }

  if (canShowJoinTab) {
    return (
      <Button size="sm" onClick={() => onSelectTab("join")}>
        {event.viewerJoined ? "View status" : "Join"}
      </Button>
    );
  }

  return null;
}

function MetaLine({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <span className="mt-0.5 shrink-0 text-muted-foreground">{icon}</span>
      <span className="min-w-0 leading-5">{children}</span>
    </div>
  );
}

function PrivacyNotice({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-xl bg-muted/45 px-3 py-2 text-xs leading-5 text-muted-foreground">
      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

function OverviewTab({
  event,
  canSeePrivateDetails,
}: {
  event: Event;
  canSeePrivateDetails: boolean;
}) {
  const hasDescription =
    Boolean(event.descriptionMarkdown?.trim()) ||
    Boolean(event.description?.trim()) ||
    Boolean(event.shortDescription?.trim());
  const freedivingDetails = getFreedivingDetails(event);
  const logisticsSections = getLogisticsSections(event, canSeePrivateDetails);
  const hasMissingDetails = event.viewerCanManage && hasOrganizerMissingDetails(event);

  return (
    <div className="space-y-6">
      {hasDescription && canSeePrivateDetails ? (
        <DetailSection title="About">
          {event.descriptionMarkdown?.trim() ? (
            <ChikaMarkdown content={event.descriptionMarkdown} />
          ) : (
            <p className="text-sm leading-6 text-muted-foreground">
              {event.description || event.shortDescription}
            </p>
          )}
        </DetailSection>
      ) : canSeePrivateDetails ? (
        <DetailSection title="About">
          <p className="text-sm leading-6 text-muted-foreground">
            The organizer has not added a full description yet.
          </p>
        </DetailSection>
      ) : null}

      <DetailSection title="Schedule and location">
        <div className="space-y-2 text-sm leading-6 text-muted-foreground">
          <MetaLine icon={<CalendarClock className="h-4 w-4" />}>
            {formatEventDate(event.startsAt, event.endsAt, event.timezone)}
          </MetaLine>
          <MetaLine icon={<MapPin className="h-4 w-4" />}>
            {formatEventLocation(event)}
          </MetaLine>
          {canSeePrivateDetails && event.meetingPoint ? (
            <p className="pt-1 text-foreground">{event.meetingPoint}</p>
          ) : null}
        </div>
      </DetailSection>

      <DetailSection title="Event fit">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge className="h-6 px-2 text-[11px]">
            {eventOptionLabel(event.type)}
          </Badge>
          <Badge variant="outline" className="h-6 px-2 text-[11px]">
            {titleCase(event.difficulty)}
          </Badge>
          {event.beginnerFriendly ? (
            <Badge variant="secondary" className="h-6 px-2 text-[11px]">
              Beginner-friendly
            </Badge>
          ) : null}
          {freedivingDetails.map((detail) => (
            <Badge
              key={detail}
              variant="outline"
              className="h-6 px-2 text-[11px]"
            >
              {detail}
            </Badge>
          ))}
        </div>
      </DetailSection>

      {logisticsSections.length > 0 ? (
        <DetailSection title="Logistics">
          <div className="space-y-4">
            {logisticsSections.map((section) => (
              <TextBlock
                key={section.title}
                title={section.title}
                body={section.body}
              />
            ))}
          </div>
        </DetailSection>
      ) : null}

      {hasMissingDetails ? (
        <PrivacyNotice>
          Some event details are missing. Add them from Manage.
        </PrivacyNotice>
      ) : null}
    </div>
  );
}

function TextBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="space-y-1">
      <h3 className="text-sm font-medium text-foreground">{title}</h3>
      <p className="text-sm leading-6 text-muted-foreground">{body}</p>
    </div>
  );
}

function JoinTab({
  event,
  isSignedIn,
  joinNote,
  setJoinNote,
  joinDialogOpen,
  setJoinDialogOpen,
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
  joinDialogOpen: boolean;
  setJoinDialogOpen: (open: boolean) => void;
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
  const stateLabel = getViewerStateLabel(viewerState) ?? "Not joined";
  const paymentStatus = getPaymentStatusLabel(
    event.viewerPayment?.status ?? (event.isPaid ? "pending_upload" : "not_required"),
  );

  return (
    <div className="space-y-4">
      <StatusPanel
        title={stateLabel}
        description={
          event.isPaid
            ? `Payment: ${paymentStatus}`
            : event.requiresApproval
              ? "The organizer approves requests before confirmation."
              : "Joining confirms your spot if capacity is available."
        }
      >
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className="h-6 px-2 text-[11px]">
            {event.interestedCount ?? 0} interested
          </Badge>
          <Badge variant="outline" className="h-6 px-2 text-[11px]">
            {event.goingCount ?? event.currentAttendees} going
          </Badge>
        </div>
      </StatusPanel>

      {!isSignedIn ? (
        <SignInButton mode="modal">
          <Button>Sign in to join or mark interested</Button>
        </SignInButton>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {canToggleInterest ? (
            viewerState === "interested" ? (
              <Button
                variant="outline"
                disabled={isInterestPending}
                onClick={onMarkUninterested}
              >
                Remove interest
              </Button>
            ) : (
              <Button
                variant="outline"
                disabled={isInterestPending}
                onClick={onMarkInterested}
              >
                Interested
              </Button>
            )
          ) : null}

          {event.viewerJoined ? (
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button
                    variant="outline"
                    disabled={
                      isLeaving || event.viewerParticipation?.role === "organizer"
                    }
                  />
                }
              >
                Leave event
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Leave event?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Your participation will be marked as left. You may need the
                    organizer to reactivate it if you change your mind.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onLeave}>
                    Leave event
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : canJoin ? (
            <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
              <Button
                disabled={isJoining || event.status !== "published"}
                onClick={() => setJoinDialogOpen(true)}
              >
                {event.requiresApproval ? "Request to join" : "Join event"}
              </Button>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {event.requiresApproval ? "Request to join" : "Join event"}
                  </DialogTitle>
                  <DialogDescription>
                    Add a short note for the organizer if there is anything they
                    should know.
                  </DialogDescription>
                </DialogHeader>
                <SetupField label="Message to organizer">
                  <Textarea
                    id="join-note"
                    className="min-h-28"
                    value={joinNote}
                    onChange={(item) => setJoinNote(item.target.value)}
                    placeholder="Optional note, experience level, or question"
                  />
                </SetupField>
                <DialogFooter showCloseButton>
                  <Button disabled={isJoining} onClick={onJoin}>
                    {isJoining
                      ? "Sending..."
                      : event.requiresApproval
                        ? "Send request"
                        : "Join event"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : (
            <p className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">
              This participation record is closed. Ask the organizer to
              reactivate it if needed.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function PaymentTab({
  event,
  paymentMethods,
  selectedPaymentMethodId,
  setSelectedPaymentMethodId,
  referenceNumber,
  setReferenceNumber,
  proofFile,
  setProofFile,
  paymentDialogOpen,
  setPaymentDialogOpen,
  onSubmitPayment,
  isSubmitting,
  onViewPaymentProof,
  viewingPaymentProofId,
  onManagePayment,
}: {
  event: Event;
  paymentMethods: EventPaymentMethod[];
  selectedPaymentMethodId: string;
  setSelectedPaymentMethodId: (value: string) => void;
  referenceNumber: string;
  setReferenceNumber: (value: string) => void;
  proofFile: File | null;
  setProofFile: (value: File | null) => void;
  paymentDialogOpen: boolean;
  setPaymentDialogOpen: (open: boolean) => void;
  onSubmitPayment: () => void;
  isSubmitting: boolean;
  onViewPaymentProof: (paymentId: string) => void;
  viewingPaymentProofId?: string;
  onManagePayment: () => void;
}) {
  const payment = event.viewerPayment;
  const selectedMethod =
    paymentMethods.find((method) => method.id === selectedPaymentMethodId) ??
    paymentMethods[0];

  if (!event.isPaid) {
    return (
      <StatusPanel title="This event is free" description="No payment is needed." />
    );
  }

  if (event.viewerCanManage && paymentMethods.length === 0) {
    return (
      <StatusPanel
        title="Payment setup is incomplete"
        description="Add payment methods in Manage before participants can pay."
      >
        <Button size="sm" onClick={onManagePayment}>
          Set up payment
        </Button>
      </StatusPanel>
    );
  }

  return (
    <div className="space-y-5">
      <StatusPanel
        title={
          event.priceAmount == null
            ? "Payment pending"
            : `${event.currency} ${event.priceAmount}`
        }
        description={getPaymentStatusLabel(payment?.status ?? "pending_upload")}
      >
        {payment?.proofMediaId ? (
          <Button
            size="sm"
            variant="outline"
            disabled={viewingPaymentProofId === payment.id}
            onClick={() => onViewPaymentProof(payment.id)}
          >
            {viewingPaymentProofId === payment.id
              ? "Opening..."
              : "View submitted proof"}
          </Button>
        ) : null}
      </StatusPanel>

      {event.paymentInstructions ? (
        <DetailSection title="Instructions">
          <p className="text-sm leading-6 text-muted-foreground">
            {event.paymentInstructions}
          </p>
        </DetailSection>
      ) : null}

      {paymentMethods.length > 0 ? (
        <DetailSection title="Payment methods">
          <div className="space-y-3">
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
            <PaymentMethodDetails method={selectedMethod} />
          </div>
        </DetailSection>
      ) : (
        <p className="text-sm text-muted-foreground">
          Payment setup is not ready yet. Check back after the organizer adds
          payment details.
        </p>
      )}

      {event.viewerJoined && paymentMethods.length > 0 ? (
        <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
          <Button onClick={() => setPaymentDialogOpen(true)}>
            <Upload className="mr-1 h-4 w-4" />
            Upload payment proof
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload payment proof</DialogTitle>
              <DialogDescription>
                Submit a receipt or transfer screenshot for organizer review.
              </DialogDescription>
            </DialogHeader>
            <SetupField label="Payment method">
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
            </SetupField>
            <SetupField label="Reference number">
              <Input
                id="payment-reference"
                value={referenceNumber}
                onChange={(item) => setReferenceNumber(item.target.value)}
                placeholder="Optional transaction reference"
              />
            </SetupField>
            <SetupField label="Proof of payment">
              <Input
                id="payment-proof"
                type="file"
                accept="image/*"
                onChange={(item) =>
                  setProofFile(item.target.files?.[0] ?? null)
                }
              />
            </SetupField>
            {proofFile ? (
              <p className="text-xs text-muted-foreground">{proofFile.name}</p>
            ) : null}
            <DialogFooter showCloseButton>
              <Button
                disabled={isSubmitting || !proofFile}
                onClick={onSubmitPayment}
              >
                {isSubmitting ? "Submitting..." : "Submit proof"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}

function PaymentMethodDetails({ method }: { method?: EventPaymentMethod }) {
  if (!method) return null;
  return (
    <div className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">
      <p className="font-medium text-foreground">{method.name}</p>
      {method.instructions ? <p className="mt-1">{method.instructions}</p> : null}
      {method.type === "MANUAL_BANK_TRANSFER" ? (
        <div className="mt-2 grid gap-1">
          {method.bankName ? <span>Bank: {method.bankName}</span> : null}
          {method.accountName ? <span>Name: {method.accountName}</span> : null}
          {method.accountNumber ? <span>Account: {method.accountNumber}</span> : null}
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
      title={event.viewerCanManage ? "Participants and payments" : "Participants"}
    >
      <div className="mb-3 flex flex-wrap gap-1.5">
        <Badge variant="outline" className="h-6 px-2 text-[11px]">
          {event.goingCount ?? event.currentAttendees} going
        </Badge>
        <Badge variant="outline" className="h-6 px-2 text-[11px]">
          {event.interestedCount ?? 0} interested
        </Badge>
      </div>
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
              {viewingPaymentProofId === payment.id ? "Opening..." : "View proof"}
            </Button>
          ) : null}
          {payment.referenceNumber ? <span>Ref: {payment.referenceNumber}</span> : null}
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

type OrganizerSetupEditor =
  | "description"
  | "schedule"
  | "capacity"
  | "payment"
  | "fit"
  | "logistics";

const EVENT_DETAIL_TIMEZONE = "Asia/Manila";

function OrganizerManageTab({
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
  const [startsAt, setStartsAt] = useState(
    toDateTimeLocalValue(event.startsAt, event.timezone),
  );
  const [endsAt, setEndsAt] = useState(
    toDateTimeLocalValue(event.endsAt, event.timezone),
  );
  const [diveSiteId, setDiveSiteId] = useState(event.diveSiteId ?? "");
  const [diveSiteLabel, setDiveSiteLabel] = useState(
    event.diveSite ? `${event.diveSite.name} · ${event.diveSite.area}` : "",
  );
  const [capacity, setCapacity] = useState(
    event.capacity ? String(event.capacity) : "",
  );
  const [visibility, setVisibility] = useState<EventVisibility>(
    event.visibility,
  );
  const [requiresApproval, setRequiresApproval] = useState(
    event.requiresApproval,
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

  const closeEditor = () => setActiveEditor(null);
  const savePatch = (data: UpdateEventRequest, successMessage: string) => {
    updateEventMutation.mutate(
      { eventId: event.id, data },
      {
        onSuccess: () => {
          toast.success(successMessage);
          closeEditor();
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

  const saveSchedule = () => {
    const startsAtIso = toISO(startsAt, event.timezone || EVENT_DETAIL_TIMEZONE);
    const endsAtIso = toISO(endsAt, event.timezone || EVENT_DETAIL_TIMEZONE);
    if (!diveSiteId) {
      toast.error("Select an approved dive site.");
      return;
    }
    if (!startsAtIso || !endsAtIso) {
      toast.error("Start and end date/time are required.");
      return;
    }
    if (new Date(endsAtIso).getTime() <= new Date(startsAtIso).getTime()) {
      toast.error("End time must be after start time.");
      return;
    }
    savePatch(
      {
        diveSiteId,
        startsAt: startsAtIso,
        endsAt: endsAtIso,
        timezone: event.timezone || EVENT_DETAIL_TIMEZONE,
      },
      "Schedule and dive site saved.",
    );
  };

  const saveCapacity = () => {
    const value = Number.parseInt(capacity, 10);
    if (!Number.isFinite(value) || value < 1) {
      toast.error("Capacity must be at least 1.");
      return;
    }
    savePatch(
      { capacity: value, visibility, requiresApproval },
      "Capacity and access saved.",
    );
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
            closeEditor();
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
                closeEditor();
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
    <div className="space-y-4">
      <DetailSection title="Manage event">
        <p className="text-sm leading-6 text-muted-foreground">
          Add more details for participants. Each setup area opens in a focused
          dialog.
        </p>
      </DetailSection>

      <div className="divide-y divide-border/70 border-y border-border/70">
        <ManageRow
          title="Event description"
          status={event.descriptionMarkdown ? "Added" : "Missing"}
          actionLabel={event.descriptionMarkdown ? "Edit" : "Add"}
          onAction={() => setActiveEditor("description")}
        />
        <ManageRow
          title="Schedule and dive site"
          status={formatEventLocation(event)}
          actionLabel="Edit"
          onAction={() => setActiveEditor("schedule")}
        />
        <ManageRow
          title="Capacity and access"
          status={event.capacity ? `${event.capacity} spots` : "Not set"}
          actionLabel={event.capacity ? "Edit" : "Set"}
          onAction={() => setActiveEditor("capacity")}
        />
        <ManageRow
          title="Freediving details"
          status={getFitStatus(event)}
          actionLabel="Edit"
          onAction={() => setActiveEditor("fit")}
        />
        <ManageRow
          title="Safety and logistics"
          status={getLogisticsStatus(event)}
          actionLabel="Edit"
          onAction={() => setActiveEditor("logistics")}
        />
        <ManageRow
          title="Payment setup"
          status={getPaymentSetupStatus(event, activePaymentMethods.length)}
          actionLabel={event.isPaid ? "Manage" : "Set paid"}
          onAction={() => setActiveEditor("payment")}
        />
      </div>

      <Dialog
        open={activeEditor === "description"}
        onOpenChange={(open) => setActiveEditor(open ? "description" : null)}
      >
        <DialogContent className="max-w-2xl!">
          <DialogHeader>
            <DialogTitle>Edit description</DialogTitle>
            <DialogDescription>
              Write the participant-facing event details.
            </DialogDescription>
          </DialogHeader>
          <SetupField label="Full description">
            <Textarea
              className="min-h-40"
              value={descriptionMarkdown}
              onChange={(item) => setDescriptionMarkdown(item.target.value)}
              placeholder="Schedule, inclusions, what to bring, and organizer notes"
            />
          </SetupField>
          <DialogFooter showCloseButton>
            <Button disabled={isSaving} onClick={saveDescription}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={activeEditor === "schedule"}
        onOpenChange={(open) => setActiveEditor(open ? "schedule" : null)}
      >
        <DialogContent className="max-w-2xl!">
          <DialogHeader>
            <DialogTitle>Edit schedule and dive site</DialogTitle>
            <DialogDescription>
              Update the time and approved dive site participants should see.
            </DialogDescription>
          </DialogHeader>
          <SetupField label="Dive site">
            <DiveSiteCombobox
              value={diveSiteId}
              valueLabel={diveSiteLabel}
              searchPlaceholder="Search approved dive sites"
              onValueChange={(value, site) => {
                setDiveSiteId(value);
                setDiveSiteLabel(site ? `${site.name} · ${site.area}` : "");
              }}
            />
          </SetupField>
          <div className="grid gap-3 sm:grid-cols-2">
            <SetupField label="Starts">
              <Input
                type="datetime-local"
                value={startsAt}
                onChange={(item) => setStartsAt(item.target.value)}
              />
            </SetupField>
            <SetupField label="Ends">
              <Input
                type="datetime-local"
                value={endsAt}
                onChange={(item) => setEndsAt(item.target.value)}
              />
            </SetupField>
          </div>
          <p className="text-xs text-muted-foreground">
            Times are saved in Philippine time.
          </p>
          <DialogFooter showCloseButton>
            <Button disabled={isSaving} onClick={saveSchedule}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={activeEditor === "capacity"}
        onOpenChange={(open) => setActiveEditor(open ? "capacity" : null)}
      >
        <DialogContent className="max-w-2xl!">
          <DialogHeader>
            <DialogTitle>Edit capacity and access</DialogTitle>
            <DialogDescription>
              Control capacity, visibility, and whether joins need organizer
              approval.
            </DialogDescription>
          </DialogHeader>
          <SetupField label="Capacity">
            <Input
              type="number"
              min={1}
              value={capacity}
              onChange={(item) => setCapacity(item.target.value)}
              placeholder="8"
            />
          </SetupField>
          <div className="grid gap-3 sm:grid-cols-2">
            <SetupField label="Visibility">
              <Select
                value={visibility}
                onValueChange={(value) => setVisibility(value as EventVisibility)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                </SelectContent>
              </Select>
            </SetupField>
            <label className="flex items-start gap-2 rounded-lg border border-border/70 p-3 text-sm">
              <input
                className="mt-1"
                type="checkbox"
                checked={requiresApproval}
                onChange={(item) => setRequiresApproval(item.target.checked)}
              />
              <span>
                <span className="block font-medium text-foreground">
                  Approval required
                </span>
                <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                  Organizer approval is needed before a participant is confirmed.
                </span>
              </span>
            </label>
          </div>
          <DialogFooter showCloseButton>
            <Button disabled={isSaving} onClick={saveCapacity}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={activeEditor === "fit"}
        onOpenChange={(open) => setActiveEditor(open ? "fit" : null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit event details</DialogTitle>
            <DialogDescription>
              Keep this to details divers need to judge fit.
            </DialogDescription>
          </DialogHeader>
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
                  setEntryType(value === "none" ? "" : (value as EventEntryType))
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
          <DialogFooter showCloseButton>
            <Button disabled={isSaving} onClick={saveFit}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={activeEditor === "logistics"}
        onOpenChange={(open) => setActiveEditor(open ? "logistics" : null)}
      >
        <DialogContent className="max-w-2xl!">
          <DialogHeader>
            <DialogTitle>Edit safety and logistics</DialogTitle>
            <DialogDescription>
              Add only the details participants need before they commit.
            </DialogDescription>
          </DialogHeader>
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
          <DialogFooter showCloseButton>
            <Button disabled={isSaving} onClick={saveLogistics}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={activeEditor === "payment"}
        onOpenChange={(open) => setActiveEditor(open ? "payment" : null)}
      >
        <DialogContent className="max-w-2xl!">
          <DialogHeader>
            <DialogTitle>Manage payment methods</DialogTitle>
            <DialogDescription>
              Add payment amount, participant instructions, and one active
              payment method.
            </DialogDescription>
          </DialogHeader>
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
          <DialogFooter showCloseButton>
            <Button disabled={isSaving} onClick={savePayment}>
              {isSaving ? "Saving..." : "Save payment setup"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ManageRow({
  title,
  status,
  actionLabel,
  note,
  disabled,
  onAction,
}: {
  title: string;
  status: string;
  actionLabel: string;
  note?: string;
  disabled?: boolean;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{status}</p>
        {note ? <p className="mt-1 text-xs text-muted-foreground">{note}</p> : null}
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={disabled}
        onClick={onAction}
      >
        {actionLabel}
      </Button>
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

function StatusPanel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-background/70 p-4">
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {children ? <div className="mt-4">{children}</div> : null}
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
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  );
}

function getViewerStateLabel(state: Event["viewerEventState"]) {
  switch (state) {
    case "interested":
      return "You're interested";
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
    case "anonymous":
    case "none":
    default:
      return null;
  }
}

function getPaymentStatusLabel(status: EventPaymentStatus) {
  switch (status) {
    case "not_required":
      return "No payment required";
    case "pending_upload":
      return "Upload payment proof";
    case "submitted":
      return "Proof submitted";
    case "verified":
      return "Payment verified";
    case "rejected":
      return "Payment rejected";
    default:
      return titleCase(status);
  }
}

function formatEventPriceLabel(event: Event) {
  if (!event.isPaid) return "Free";
  if (event.priceAmount == null) return "Paid";
  return `${event.currency} ${event.priceAmount}`;
}

function getPaymentSetupStatus(event: Event, activePaymentMethodCount: number) {
  if (!event.isPaid) return "Free event";
  if (activePaymentMethodCount === 0) return "Incomplete";
  if (event.priceAmount == null) return "Payment pending";
  return "Ready";
}

function getFitStatus(event: Event) {
  const parts = [
    titleCase(event.difficulty),
    event.entryType ? titleCase(event.entryType) : "",
    event.maxDepthM ? `${event.maxDepthM}m max` : "",
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

function getFreedivingDetails(event: Event) {
  return [
    event.maxDepthM ? `${event.maxDepthM}m max` : "",
    event.entryType ? titleCase(event.entryType) : "",
  ].filter(Boolean);
}

function getLogisticsSections(event: Event, canSeePrivateDetails: boolean) {
  if (!canSeePrivateDetails) return [];
  return [
    { title: "Equipment", body: event.equipmentNotes },
    { title: "Safety", body: event.safetyNotes },
    { title: "Cancellation", body: event.cancellationPolicy },
  ].filter((section): section is { title: string; body: string } =>
    Boolean(section.body?.trim()),
  );
}

function hasOrganizerMissingDetails(event: Event) {
  return [
    event.descriptionMarkdown,
    event.capacity,
    event.meetingPoint,
    event.equipmentNotes,
    event.safetyNotes,
    event.cancellationPolicy,
    event.entryType,
    event.maxDepthM,
  ].some((value) => !value);
}

function formatEventLocation(event: Event) {
  if (event.diveSite) {
    return `${event.diveSite.name} · ${event.diveSite.area}`;
  }
  return (
    event.locationName ||
    event.formattedAddress ||
    event.location ||
    "Dive site not shown"
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
  return `${formatter.format(startDate)} - ${formatter.format(endDate)}`;
}

function toDateTimeLocalValue(value?: string, timezone?: string) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: timezone || EVENT_DETAIL_TIMEZONE,
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  const year = part("year");
  const month = part("month");
  const day = part("day");
  const hour = part("hour");
  const minute = part("minute");
  if (!year || !month || !day || !hour || !minute) return "";
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function toISO(value: string, timeZone: string) {
  if (!value) return "";
  const parsed = parseDateTimeLocal(value);
  if (!parsed) return "";
  try {
    const wallClockUTC = Date.UTC(
      parsed.year,
      parsed.month - 1,
      parsed.day,
      parsed.hour,
      parsed.minute,
      parsed.second,
    );
    const firstOffset = getTimeZoneOffsetMs(new Date(wallClockUTC), timeZone);
    const correctedUTC = wallClockUTC - firstOffset;
    const secondOffset = getTimeZoneOffsetMs(new Date(correctedUTC), timeZone);
    const date = new Date(wallClockUTC - secondOffset);
    if (Number.isNaN(date.getTime())) return "";
    return date.toISOString();
  } catch {
    return "";
  }
}

function parseDateTimeLocal(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(
    value.trim(),
  );
  if (!match) return null;
  return {
    year: Number.parseInt(match[1] ?? "", 10),
    month: Number.parseInt(match[2] ?? "", 10),
    day: Number.parseInt(match[3] ?? "", 10),
    hour: Number.parseInt(match[4] ?? "", 10),
    minute: Number.parseInt(match[5] ?? "", 10),
    second: Number.parseInt(match[6] ?? "0", 10),
  };
}

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number.parseInt(parts.find((item) => item.type === type)?.value ?? "0", 10);
  const asUTC = Date.UTC(
    part("year"),
    part("month") - 1,
    part("day"),
    part("hour"),
    part("minute"),
    part("second"),
  );
  return asUTC - date.getTime();
}

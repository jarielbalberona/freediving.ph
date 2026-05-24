"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { SignInButton } from "@clerk/nextjs";
import type { IScannerControls } from "@zxing/browser";
import type {
  Event,
  EventCompetition,
  EventDifficulty,
  EventEntryType,
  EventParticipant,
  EventPass,
  EventPaymentMethod,
  EventPaymentMode,
  EventPaymentStatus,
  EventPost,
  EventPostType,
  EventProgramItem,
  EventPrize,
  EventPrizePlacement,
  EventPrizeType,
  EventSponsor,
  EventSponsorTier,
  EventVisibility,
  EventJoinFormField,
  CreateEventPrizeRequest,
  CreateEventProgramItemRequest,
  CreateEventSponsorRequest,
  CreateEventPaymentMethodRequest,
  DuplicateEventRequest,
  UpdateEventRequest,
  UpdateEventPaymentMethodRequest,
  UpdateEventPrizeRequest,
  UpdateEventProgramItemRequest,
  UpdateEventSponsorRequest,
} from "@freediving.ph/types";
import { DEFAULT_TIMEZONE } from "@freediving.ph/config";
import {
  ArrowLeft,
  Award,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Copy,
  CreditCard,
  ImageIcon,
  Handshake,
  GripVertical,
  LayoutDashboard,
  Lock,
  MapPin,
  MessageSquare,
  Pencil,
  Pin,
  Plus,
  QrCode,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Ticket,
  Trash2,
  type LucideIcon,
  Upload,
  Users,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
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
import { MarkdownEditor } from "@/features/chika/components/MarkdownEditor";
import { DiveSiteCombobox } from "@/features/diveSpots/components/DiveSiteCombobox";
import {
  difficultyOptions,
  entryTypeOptions,
  eventOptionLabel,
  titleCase,
  useCheckInEventPass,
  useApproveEventParticipant,
  useAddEventPostFishReaction,
  useCreateEventCompetition,
  useCreateEventPaymentMethod,
  useCreateEventPost,
  useCreateEventProgramItem,
  useCreateEventPrize,
  useCreateEventSponsor,
  useDeleteEventCompetition,
  useDeleteEventPost,
  useDeleteEventPostFishReaction,
  useDeleteEventProgramItem,
  useDeleteEventPrize,
  useDeleteEventSponsor,
  useEvent,
  useEventCompetitions,
  useEventJoinFormFields,
  useEventParticipants,
  useEventPassVerification,
  useEventPaymentProofUrl,
  useEventPosts,
  useEventProgramItems,
  useEventPrizes,
  useEventSponsors,
  useJoinEvent,
  useLeaveEvent,
  useMarkEventInterested,
  useMarkEventUninterested,
  useRejectEventParticipant,
  useRejectEventPayment,
  useRegenerateEventPass,
  useSubmitEventPayment,
  useDuplicateEvent,
  useUpdateEventCompetition,
  useUpdateEvent,
  useUpdateEventJoinFormFields,
  useUpdateEventModules,
  useUpdateEventParticipantStatus,
  useUpdateEventParticipantRole,
  useUpdateEventPaymentMethod,
  useUpdateEventPost,
  useUpdateEventPostSettings,
  useUpdateEventProgramItem,
  useUpdateEventPrize,
  useUpdateEventSponsor,
  useVerifyEventPayment,
} from "@/features/events";
import { mediaApi } from "@/features/media/api/media";
import {
  PaymentMethodCustomerDisplay,
  PaymentMethodsSetup,
} from "@/features/payments/components/PaymentMethodsSetup";
import { siteConfig } from "@/config/site";
import { dateStringToDate, dateToDateString } from "@/lib/date-picker-values";
import { getApiErrorMessage, getApiErrorStatus } from "@/lib/http/api-error";
import { formatPeso } from "@/lib/money";
import { cn } from "@/lib/utils";

type EventTab =
  | "updates"
  | "overview"
  | "program"
  | "participants"
  | "prizes"
  | "sponsors"
  | "payment";

type EventManageTab =
  | "overview"
  | "setup"
  | "participants"
  | "join-form"
  | "program"
  | "payment"
  | "updates"
  | "awards"
  | "sponsors"
  | "settings";

const eventTabsListClassName =
  "no-scrollbar -mx-3 w-[calc(100%+1.5rem)] justify-start overflow-x-auto overflow-y-hidden rounded-none border-b border-border/70 bg-transparent px-3 sm:mx-0 sm:w-full sm:px-0";
const eventTabTriggerClassName =
  "h-10 flex-none rounded-none px-3 text-sm data-active:bg-transparent data-active:shadow-none";
const manageTabsListClassName =
  "no-scrollbar -mx-3 w-[calc(100%+1.5rem)] justify-start overflow-x-auto overflow-y-hidden px-3 sm:mx-0 sm:w-full sm:px-1";
const manageTabTriggerClassName = "h-8 flex-none px-3 text-sm";
const manageNestedTabsListClassName = manageTabsListClassName;
const manageNestedTabTriggerClassName = manageTabTriggerClassName;
const manageSideNavTriggerClassName =
  "inline-flex h-9 w-full items-center justify-start rounded-lg px-2 text-left text-xs";
const eventPassQrLogoUrl = "https://cdn.freediving.ph/fph-logo-white.png";

const manageNavItems: Array<{
  value: EventManageTab;
  label: string;
  icon: LucideIcon;
}> = [
  { value: "overview", label: "Overview", icon: LayoutDashboard },
  { value: "setup", label: "Setup", icon: CheckCircle2 },
  { value: "settings", label: "Settings", icon: Settings2 },
  { value: "participants", label: "Participants", icon: Users },
  { value: "join-form", label: "Join Form", icon: ClipboardList },
  { value: "program", label: "Program", icon: CalendarClock },
  { value: "payment", label: "Payment", icon: CreditCard },
  { value: "updates", label: "Posts", icon: MessageSquare },
  { value: "awards", label: "Awards", icon: Award },
  { value: "sponsors", label: "Sponsors", icon: Handshake },
];

function getVisibleManageNavItems(event: Event) {
  return manageNavItems.filter((item) => {
    switch (item.value) {
      case "payment":
        return event.paymentEnabled;
      case "updates":
        return event.postsEnabled;
      case "awards":
        return event.awardsEnabled;
      case "sponsors":
        return event.sponsorsEnabled;
      case "program":
        return event.programEnabled;
      default:
        return true;
    }
  });
}

type EventPassScanTarget = {
  slug: string;
  token: string;
  wrongEvent: boolean;
};

export function parseEventPassScanValue(
  value: string,
  currentSlug: string,
): EventPassScanTarget | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const urlMatch = trimmed.match(/\/events\/([^/?#]+)\/pass\/([^/?#]+)/);
  if (urlMatch) {
    const scannedSlug = decodeURIComponent(urlMatch[1] ?? "");
    const token = decodeURIComponent(urlMatch[2] ?? "");
    if (!scannedSlug || !token) return null;
    return {
      slug: scannedSlug,
      token,
      wrongEvent: scannedSlug !== currentSlug,
    };
  }
  if (/^[A-Za-z0-9_-]{12,}$/.test(trimmed)) {
    return { slug: currentSlug, token: trimmed, wrongEvent: false };
  }
  return null;
}

export default function EventDetailClient({ slug }: { slug: string }) {
  const session = useSession();
  const isSignedIn = session.status === "signed_in";
  const [activeTab, setActiveTab] = useState<EventTab>("updates");
  const [joinNote, setJoinNote] = useState("");
  const [joinAnswers, setJoinAnswers] = useState<Record<string, string>>({});
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  const eventQuery = useEvent(slug);
  const event = eventQuery.data;
  const eventId = event?.id ?? "";
  const canFetchDetailExtensions =
    Boolean(eventId) &&
    Boolean(event) &&
    (event?.visibility === "public" ||
      event?.viewerCanViewPrivateDetails ||
      event?.viewerCanManage);
  const canFetchPosts =
    Boolean(eventId) &&
    Boolean(event) &&
    Boolean(event?.postsEnabled) &&
    (event?.visibility === "public" ||
      event?.viewerCanViewPrivateDetails ||
      event?.viewerCanManage);
  const participantsQuery = useEventParticipants(
    eventId,
    Boolean(eventId) &&
      Boolean(event) &&
      (event?.visibility === "public" ||
        event?.viewerCanViewPrivateDetails ||
        event?.viewerCanManage),
  );
  const competitionsQuery = useEventCompetitions(
    eventId,
    canFetchDetailExtensions,
  );
  const prizesQuery = useEventPrizes(eventId, canFetchDetailExtensions);
  const sponsorsQuery = useEventSponsors(eventId, canFetchDetailExtensions);
  const postsQuery = useEventPosts(eventId, canFetchPosts);
  const programQuery = useEventProgramItems(
    eventId,
    canFetchDetailExtensions &&
      Boolean(event?.programEnabled || event?.viewerCanManage),
  );
  const joinFormFieldsQuery = useEventJoinFormFields(eventId, Boolean(eventId));
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
  const updateParticipantRoleMutation = useUpdateEventParticipantRole();

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
  const activePaymentMethods = paymentMethods.filter(
    (method) => method.isActive,
  );
  const selectedPaymentMethod =
    activePaymentMethods.find(
      (method) => method.id === selectedPaymentMethodId,
    ) ?? activePaymentMethods[0];
  const canShowJoinPanel =
    !event.viewerCanManage &&
    !event.viewerJoined &&
    (isSignedIn || event.viewerEventState !== "anonymous");
  const canShowParticipantsTab =
    event.visibility === "public" ||
    event.viewerCanViewPrivateDetails ||
    event.viewerCanManage;
  const canShowPrizeSponsorTabs = canSeePrivateDetails;
  const canShowAwardsTab = canShowPrizeSponsorTabs && event.awardsEnabled;
  const canShowSponsorsTab = canShowPrizeSponsorTabs && event.sponsorsEnabled;
  const canShowUpdatesTab =
    event.postsEnabled &&
    (event.visibility === "public" || event.viewerCanViewPrivateDetails);
  const canShowPaymentTab =
    canSeePrivateDetails &&
    acceptsEventPayments(event) &&
    event.paymentEnabled &&
    (!requiresEventPayment(event) ||
      event.viewerJoined ||
      event.viewerCanManage);
  const canShowProgramTab =
    canSeePrivateDetails && Boolean(event.programEnabled);
  const visibleTabs: EventTab[] = [
    ...(canShowUpdatesTab ? (["updates"] as const) : []),
    "overview",
    ...(canShowProgramTab ? (["program"] as const) : []),
    ...(canShowParticipantsTab ? (["participants"] as const) : []),
    ...(canShowAwardsTab ? (["prizes"] as const) : []),
    ...(canShowSponsorsTab ? (["sponsors"] as const) : []),
    ...(canShowPaymentTab ? (["payment"] as const) : []),
  ];
  const currentTab = visibleTabs.includes(activeTab)
    ? activeTab
    : (visibleTabs[0] ?? "overview");

  const handleJoin = () => {
    const missingField = (joinFormFieldsQuery.data ?? []).find(
      (field) =>
        field.enabled &&
        field.required &&
        !String(joinAnswers[field.fieldKey] ?? "").trim(),
    );
    if (missingField) {
      toast.error(`${missingField.label} is required.`);
      return;
    }
    joinMutation.mutate(
      {
        eventId,
        participantNote: joinNote.trim() || undefined,
        joinAnswers,
      },
      {
        onSuccess: (participant) => {
          setJoinNote("");
          setJoinAnswers({});
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
        canShowJoinPanel={canShowJoinPanel}
        canShowPaymentTab={canShowPaymentTab}
        isSignedIn={isSignedIn}
        onSelectTab={setActiveTab}
        onJoinAction={() =>
          document
            .getElementById("event-join-actions")
            ?.scrollIntoView({ behavior: "smooth", block: "start" })
        }
        onLeave={handleLeave}
        isLeaving={leaveMutation.isPending}
      />

      {!canSeePrivateDetails ? (
        <PrivacyNotice>
          Private event details, payment instructions, and attendee identities
          are hidden until the organizer approves participation.
        </PrivacyNotice>
      ) : null}

      {canShowJoinPanel ? (
        <div id="event-join-actions" className="scroll-mt-4">
          <JoinTab
            event={event}
            isSignedIn={isSignedIn}
            joinNote={joinNote}
            setJoinNote={setJoinNote}
            joinAnswers={joinAnswers}
            setJoinAnswers={setJoinAnswers}
            joinFormFields={joinFormFieldsQuery.data ?? []}
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
        </div>
      ) : null}

      <Tabs
        value={currentTab}
        onValueChange={(value) => setActiveTab(value as EventTab)}
        className="gap-4"
      >
        <TabsList variant="line" className={eventTabsListClassName}>
          {canShowUpdatesTab ? (
            <TabsTrigger
              value="updates"
              className={eventTabTriggerClassName}
              onClick={() => setActiveTab("updates")}
            >
              Updates
            </TabsTrigger>
          ) : null}
          <TabsTrigger
            value="overview"
            className={eventTabTriggerClassName}
            onClick={() => setActiveTab("overview")}
          >
            Overview
          </TabsTrigger>
          {canShowProgramTab ? (
            <TabsTrigger
              value="program"
              className={eventTabTriggerClassName}
              onClick={() => setActiveTab("program")}
            >
              Program
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
          {canShowAwardsTab ? (
            <TabsTrigger
              value="prizes"
              className={eventTabTriggerClassName}
              onClick={() => setActiveTab("prizes")}
            >
              Competitions
            </TabsTrigger>
          ) : null}
          {canShowSponsorsTab ? (
            <TabsTrigger
              value="sponsors"
              className={eventTabTriggerClassName}
              onClick={() => setActiveTab("sponsors")}
            >
              Sponsors
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
        </TabsList>

        {canShowUpdatesTab ? (
          <TabsContent value="updates" className="space-y-4">
            <PostsTab
              event={event}
              posts={postsQuery.data ?? []}
              isLoading={postsQuery.isLoading}
              error={postsQuery.error}
              isSignedIn={isSignedIn}
              mode="public"
            />
          </TabsContent>
        ) : null}

        <TabsContent value="overview" className="space-y-6">
          <OverviewTab
            event={event}
            canSeePrivateDetails={canSeePrivateDetails}
          />
        </TabsContent>

        {canShowProgramTab ? (
          <TabsContent value="program" className="space-y-4">
            <ProgramTab
              event={event}
              items={programQuery.data ?? []}
              isLoading={programQuery.isLoading}
              error={programQuery.error}
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
                        getApiErrorMessage(
                          error,
                          "Failed to reject participant",
                        ),
                      ),
                  },
                )
              }
              onUpdateRole={(participantId, role) =>
                updateParticipantRoleMutation.mutate(
                  { eventId: event.id, participantId, data: { role } },
                  {
                    onSuccess: () => toast.success("Participant role updated."),
                    onError: (error) =>
                      toast.error(
                        getApiErrorMessage(
                          error,
                          "Failed to update participant role",
                        ),
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
              showOrganizerActions={false}
            />
          </TabsContent>
        ) : null}

        {canShowAwardsTab ? (
          <TabsContent value="prizes" className="space-y-4">
            <PrizesTab
              event={event}
              competitions={competitionsQuery.data ?? []}
              prizes={prizesQuery.data ?? []}
              isLoading={competitionsQuery.isLoading || prizesQuery.isLoading}
              error={competitionsQuery.error || prizesQuery.error}
              readOnly
            />
          </TabsContent>
        ) : null}

        {canShowSponsorsTab ? (
          <TabsContent value="sponsors" className="space-y-4">
            <SponsorsTab
              event={event}
              sponsors={sponsorsQuery.data ?? []}
              isLoading={sponsorsQuery.isLoading}
              error={sponsorsQuery.error}
              readOnly
            />
          </TabsContent>
        ) : null}

        {canShowPaymentTab ? (
          <TabsContent value="payment" className="space-y-4">
            <PaymentTab
              event={event}
              paymentMethods={activePaymentMethods}
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
              onManagePaymentHref={`/events/${encodeURIComponent(event.slug)}/manage/payments`}
            />
          </TabsContent>
        ) : null}
      </Tabs>
    </CommunityPageShell>
  );
}

export function EventManageClient({ slug }: { slug: string }) {
  const session = useSession();
  const [activeManageTab, setActiveManageTab] =
    useState<EventManageTab>("overview");
  const eventQuery = useEvent(slug);
  const event = eventQuery.data;
  const eventId = event?.id ?? "";
  const canManage = Boolean(eventId) && Boolean(event?.viewerCanManage);
  const participantsQuery = useEventParticipants(eventId, canManage);
  const joinFormFieldsQuery = useEventJoinFormFields(eventId, canManage);
  const competitionsQuery = useEventCompetitions(eventId, canManage);
  const prizesQuery = useEventPrizes(eventId, canManage);
  const sponsorsQuery = useEventSponsors(eventId, canManage);
  const programQuery = useEventProgramItems(eventId, canManage);
  const postsQuery = useEventPosts(
    eventId,
    canManage && Boolean(event?.postsEnabled || event?.viewerCanManage),
  );
  const approveParticipantMutation = useApproveEventParticipant();
  const rejectParticipantMutation = useRejectEventParticipant();
  const verifyPaymentMutation = useVerifyEventPayment();
  const rejectPaymentMutation = useRejectEventPayment();
  const proofUrlMutation = useEventPaymentProofUrl();
  const updateParticipantRoleMutation = useUpdateEventParticipantRole();
  const updateParticipantStatusMutation = useUpdateEventParticipantStatus();
  const regeneratePassMutation = useRegenerateEventPass();
  const updateModulesMutation = useUpdateEventModules();

  const participants = useMemo(
    () =>
      participantsQuery.data?.participants ??
      participantsQuery.data?.attendees ??
      [],
    [participantsQuery.data],
  );

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (isEventManageTab(hash)) {
      setActiveManageTab(hash);
    }
  }, []);

  const setManageTab = (value: string) => {
    if (!isEventManageTab(value)) return;
    setActiveManageTab(value);
    window.history.replaceState(null, "", `#${value}`);
  };

  const visibleManageNavItems = useMemo(
    () => (event ? getVisibleManageNavItems(event) : manageNavItems),
    [event],
  );

  useEffect(() => {
    if (!event) return;
    if (visibleManageNavItems.some((item) => item.value === activeManageTab)) {
      return;
    }
    setActiveManageTab("settings");
    window.history.replaceState(null, "", "#settings");
  }, [activeManageTab, event, visibleManageNavItems]);

  if (eventQuery.isLoading) {
    return (
      <CommunityPageShell>
        <CommunityHeader
          title="Opening management"
          subtitle="Loading event operations."
          navigation={<BackButton />}
        />
        <div className="space-y-3">
          <Skeleton className="h-28 w-full rounded-xl" />
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

  if (!event.viewerCanManage) {
    return (
      <CommunityPageShell>
        <CommunityHeader
          title="Manage event"
          subtitle="You do not have permission to manage this event."
          navigation={<BackToEventButton event={event} />}
        />
        <StatusPanel
          title="Organizer access required"
          description="Only event organizers can open this workspace."
        />
      </CommunityPageShell>
    );
  }

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
        title={event.title}
        subtitle="Manage event"
        navigation={<BackToEventButton event={event} />}
        action={
          <Button
            size="sm"
            nativeButton={false}
            render={
              <Link
                href={`/events/${encodeURIComponent(event.slug)}/manage/check-in`}
              />
            }
          >
            <QrCode className="mr-1 h-4 w-4" />
            Check in
          </Button>
        }
      >
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="h-6 px-2 text-[11px]">
              {titleCase(event.status)}
            </Badge>
            <Badge variant="outline" className="h-6 px-2 text-[11px]">
              {event.visibility === "private" ? "Private" : "Public"}
            </Badge>
            <Badge variant="outline" className="h-6 px-2 text-[11px]">
              {formatEventPriceLabel(event)}
            </Badge>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Manage event setup, participants, payments, updates, prizes, and
            sponsors.
          </p>
        </div>
      </CommunityHeader>

      <div className="grid gap-4 lg:grid-cols-[132px_minmax(0,1fr)]">
        <div className="space-y-2 lg:hidden">
          <Select
            value={activeManageTab}
            items={visibleManageNavItems}
            onValueChange={(value) => setManageTab(value ?? "overview")}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="start">
              {visibleManageNavItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            className="w-full justify-start"
            nativeButton={false}
            render={
              <Link
                href={`/events/${encodeURIComponent(event.slug)}/manage/check-in`}
              />
            }
          >
            <QrCode className="mr-1 h-4 w-4" />
            Check in
          </Button>
        </div>
        <nav className="hidden w-full flex-col items-stretch gap-1 border-r border-border/70 pr-2 lg:flex">
          {visibleManageNavItems.map((item) => (
            <button
              key={item.value}
              type="button"
              aria-current={activeManageTab === item.value ? "page" : undefined}
              className={cn(
                manageSideNavTriggerClassName,
                activeManageTab === item.value
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
              onClick={() => setManageTab(item.value)}
            >
              <item.icon className="mr-1.5 h-4 w-4 shrink-0" />
              {item.label}
            </button>
          ))}
          <Link
            href={`/events/${encodeURIComponent(event.slug)}/manage/check-in`}
            className={cn(
              manageSideNavTriggerClassName,
              "inline-flex items-center text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            <QrCode className="mr-1 h-4 w-4" />
            Check in
          </Link>
        </nav>

        <div className="min-w-0">
          {activeManageTab === "overview" ? (
            <div className="space-y-4">
              <ManageOverviewSection
                event={event}
                participants={participants}
                onNavigate={setManageTab}
                onSaved={() => {
                  void eventQuery.refetch();
                }}
              />
            </div>
          ) : null}

          {activeManageTab === "setup" ? (
            <div className="space-y-4">
              <OrganizerManageTab
                event={event}
                onSaved={() => {
                  void eventQuery.refetch();
                }}
                mode="setup"
                onNavigate={setManageTab}
              />
            </div>
          ) : null}

          {activeManageTab === "participants" ? (
            <div className="space-y-4">
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
                          getApiErrorMessage(
                            error,
                            "Failed to reject participant",
                          ),
                        ),
                    },
                  )
                }
                onUpdateRole={(participantId, role) =>
                  updateParticipantRoleMutation.mutate(
                    { eventId: event.id, participantId, data: { role } },
                    {
                      onSuccess: () =>
                        toast.success("Participant role updated."),
                      onError: (error) =>
                        toast.error(
                          getApiErrorMessage(
                            error,
                            "Failed to update participant role",
                          ),
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
                onRegeneratePass={(participantId) =>
                  regeneratePassMutation.mutate(
                    { eventId: event.id, participantId },
                    {
                      onSuccess: () => toast.success("Event pass regenerated."),
                      onError: (error) =>
                        toast.error(
                          getApiErrorMessage(error, "Failed to regenerate QR"),
                        ),
                    },
                  )
                }
                regeneratingPassId={
                  regeneratePassMutation.isPending
                    ? regeneratePassMutation.variables?.participantId
                    : undefined
                }
                viewingPaymentProofId={
                  proofUrlMutation.isPending
                    ? proofUrlMutation.variables?.paymentId
                    : undefined
                }
                onUpdateAttendance={(participantId, status) =>
                  updateParticipantStatusMutation.mutate(
                    { eventId: event.id, participantId, status },
                    {
                      onSuccess: () => toast.success("Participant updated."),
                      onError: (error) =>
                        toast.error(
                          getApiErrorMessage(
                            error,
                            "Failed to update participant",
                          ),
                        ),
                    },
                  )
                }
                showOrganizerActions
              />
            </div>
          ) : null}

          {activeManageTab === "join-form" ? (
            <div className="space-y-4">
              <JoinFormManageSection
                event={event}
                fields={joinFormFieldsQuery.data ?? []}
                isLoading={joinFormFieldsQuery.isLoading}
                error={joinFormFieldsQuery.error}
              />
            </div>
          ) : null}

          {activeManageTab === "program" ? (
            <div className="space-y-4">
              <ProgramManageSection
                event={event}
                items={programQuery.data ?? []}
                competitions={competitionsQuery.data ?? []}
                isLoading={programQuery.isLoading}
                error={programQuery.error}
              />
            </div>
          ) : null}

          {activeManageTab === "payment" ? (
            <div className="space-y-4">
              <OrganizerManageTab
                event={event}
                onSaved={() => {
                  void eventQuery.refetch();
                }}
                mode="payments"
                onNavigate={setManageTab}
              />
            </div>
          ) : null}

          {activeManageTab === "updates" ? (
            <div className="space-y-4">
              <PostsTab
                event={event}
                posts={postsQuery.data ?? []}
                isLoading={postsQuery.isLoading}
                error={postsQuery.error}
                isSignedIn={session.status === "signed_in"}
                mode="manage"
              />
            </div>
          ) : null}

          {activeManageTab === "awards" ? (
            <div className="space-y-4">
              <PrizesTab
                event={event}
                competitions={competitionsQuery.data ?? []}
                prizes={prizesQuery.data ?? []}
                isLoading={competitionsQuery.isLoading || prizesQuery.isLoading}
                error={competitionsQuery.error || prizesQuery.error}
              />
            </div>
          ) : null}

          {activeManageTab === "sponsors" ? (
            <div className="space-y-4">
              <SponsorsTab
                event={event}
                sponsors={sponsorsQuery.data ?? []}
                isLoading={sponsorsQuery.isLoading}
                error={sponsorsQuery.error}
              />
            </div>
          ) : null}
          {activeManageTab === "settings" ? (
            <div className="space-y-4">
              <ModuleSettingsSection
                event={event}
                isSaving={updateModulesMutation.isPending}
                onSave={(modules) =>
                  updateModulesMutation.mutate(
                    { eventId: event.id, data: { modules } },
                    {
                      onSuccess: () => {
                        toast.success("Module settings saved.");
                        void eventQuery.refetch();
                      },
                      onError: (error) =>
                        toast.error(
                          getApiErrorMessage(error, "Failed to update modules"),
                        ),
                    },
                  )
                }
              />
              <DuplicateEventSection event={event} />
            </div>
          ) : null}
        </div>
      </div>
    </CommunityPageShell>
  );
}

export function EventPaymentMethodsManageClient({ slug }: { slug: string }) {
  const eventQuery = useEvent(slug);
  const event = eventQuery.data;
  const updateEventMutation = useUpdateEvent();
  const createPaymentMethodMutation = useCreateEventPaymentMethod();
  const updatePaymentMethodMutation = useUpdateEventPaymentMethod();
  const [paymentMode, setPaymentMode] = useState<EventPaymentMode>("free");
  const [priceAmount, setPriceAmount] = useState("");
  const [paymentInstructions, setPaymentInstructions] = useState("");

  useEffect(() => {
    if (!event) return;
    setPaymentMode(getEventPaymentMode(event));
    setPriceAmount(event.priceAmount != null ? String(event.priceAmount) : "");
    setPaymentInstructions(event.paymentInstructions ?? "");
  }, [event]);

  if (eventQuery.isLoading) {
    return (
      <CommunityPageShell>
        <CommunityHeader
          title="Opening payments"
          subtitle="Loading event payment setup."
          navigation={<BackButton />}
        />
        <div className="space-y-3">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-44 w-full rounded-xl" />
        </div>
      </CommunityPageShell>
    );
  }

  if (eventQuery.error || !event) {
    return (
      <CommunityPageShell>
        <CommunityHeader
          title="Payments unavailable"
          subtitle="This event payment setup could not be opened."
          navigation={<BackButton />}
        />
        <Card className="border-destructive/30 bg-destructive/5 py-0">
          <CardContent className="p-3 text-sm text-destructive">
            {getApiErrorMessage(
              eventQuery.error,
              "This event payment setup could not be opened.",
            )}
          </CardContent>
        </Card>
      </CommunityPageShell>
    );
  }

  if (!event.viewerCanManage) {
    return (
      <CommunityPageShell>
        <CommunityHeader
          title="Manage payments"
          subtitle="You do not have permission to manage this event."
          navigation={<BackToEventButton event={event} />}
        />
        <StatusPanel
          title="Organizer access required"
          description="Only event organizers can open this payment workspace."
        />
      </CommunityPageShell>
    );
  }

  const paymentMethods = event.paymentMethods ?? [];
  const activePaymentMethodCount = paymentMethods.filter(
    (method) => method.isActive,
  ).length;
  const isSavingSetup = updateEventMutation.isPending;
  const isSavingMethod =
    createPaymentMethodMutation.isPending ||
    updatePaymentMethodMutation.isPending;

  const savePaymentSetup = () => {
    const parsedPrice = parseOptionalPrice(priceAmount);
    if (parsedPrice === "invalid") {
      toast.error("Amount must be zero or higher.");
      return;
    }
    updateEventMutation.mutate(
      {
        eventId: event.id,
        data:
          paymentMode === "free"
            ? {
                paymentMode: "free",
                isPaid: false,
                priceAmount: undefined,
                paymentInstructions: "",
              }
            : {
                paymentMode,
                isPaid: paymentMode === "required",
                priceAmount: parsedPrice,
                paymentInstructions: paymentInstructions.trim(),
              },
      },
      {
        onSuccess: () => {
          toast.success("Payment setup saved.");
          void eventQuery.refetch();
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
    <CommunityPageShell>
      <CommunityHeader
        title="Manage payments"
        subtitle={event.title}
        navigation={<BackToManageButton event={event} />}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className={getEventPriceBadgeClass(event)}>
            {formatEventPriceLabel(event)}
          </Badge>
          <Badge variant="outline" className="h-6 px-2 text-[11px]">
            {activePaymentMethodCount} active method
            {activePaymentMethodCount === 1 ? "" : "s"}
          </Badge>
        </div>
      </CommunityHeader>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <section className="space-y-4">
          <DetailSection title="Payment setup">
            <div className="grid gap-4 rounded-xl border border-border/70 bg-background/70 p-4">
              <SetupField label="Payment mode">
                <Select
                  value={paymentMode}
                  items={[
                    { value: "free", label: "Free" },
                    { value: "required", label: "Required fee" },
                    { value: "optional", label: "Optional donation" },
                  ]}
                  onValueChange={(value) =>
                    setPaymentMode(value as EventPaymentMode)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="required">Required fee</SelectItem>
                    <SelectItem value="optional">Optional donation</SelectItem>
                  </SelectContent>
                </Select>
              </SetupField>

              {paymentMode !== "free" ? (
                <>
                  <div className="grid gap-3">
                    <SetupField
                      label={
                        paymentMode === "required"
                          ? "Required fee"
                          : "Suggested amount"
                      }
                    >
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={priceAmount}
                        onChange={(item) => setPriceAmount(item.target.value)}
                        placeholder="1500"
                      />
                    </SetupField>
                  </div>
                  <SetupField label="Payment instructions">
                    <Textarea
                      className="min-h-28"
                      value={paymentInstructions}
                      onChange={(item) =>
                        setPaymentInstructions(item.target.value)
                      }
                      placeholder="Tell participants when and how to pay."
                    />
                  </SetupField>
                </>
              ) : (
                <div className="rounded-lg border border-border/70 bg-muted/35 p-3 text-sm text-muted-foreground">
                  Payment collection is off for this event.
                </div>
              )}

              <div className="flex justify-end">
                <Button disabled={isSavingSetup} onClick={savePaymentSetup}>
                  {isSavingSetup ? "Saving..." : "Save setup"}
                </Button>
              </div>
            </div>
          </DetailSection>
        </section>

        <DetailSection title="Payment methods">
          <PaymentMethodsSetup
            methods={paymentMethods}
            disabled={isSavingMethod || paymentMode === "free"}
            mediaContextType="payment_method_qr"
            mediaContextId={event.id}
            emptyDescription="Add Manual QR or bank transfer details after choosing a payment mode."
            onCreate={async (data) => {
              try {
                await createPaymentMethodMutation.mutateAsync({
                  eventId: event.id,
                  data: data as CreateEventPaymentMethodRequest,
                });
                toast.success("Payment method added.");
                void eventQuery.refetch();
              } catch (error) {
                toast.error(
                  getApiErrorMessage(error, "Failed to add payment method"),
                );
                throw error;
              }
            }}
            onUpdate={async (paymentMethodId, data) => {
              try {
                await updatePaymentMethodMutation.mutateAsync({
                  eventId: event.id,
                  paymentMethodId,
                  data: data as UpdateEventPaymentMethodRequest,
                });
                toast.success("Payment method saved.");
                void eventQuery.refetch();
              } catch (error) {
                toast.error(
                  getApiErrorMessage(error, "Failed to update payment method"),
                );
                throw error;
              }
            }}
          />
        </DetailSection>
      </div>
    </CommunityPageShell>
  );
}

export function EventCheckInClient({ slug }: { slug: string }) {
  const searchParams = useSearchParams();
  const eventQuery = useEvent(slug);
  const event = eventQuery.data;
  const eventId = event?.id ?? "";
  const canManage = Boolean(eventId) && Boolean(event?.viewerCanManage);
  const participantsQuery = useEventParticipants(eventId, canManage);
  const checkInMutation = useCheckInEventPass();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerControlsRef = useRef<IScannerControls | null>(null);
  const lastScanRef = useRef("");
  const [manualValue, setManualValue] = useState("");
  const [scanTarget, setScanTarget] = useState<EventPassScanTarget | null>(
    null,
  );
  const [scanMessage, setScanMessage] = useState("");
  const [scannerActive, setScannerActive] = useState(false);
  const [scannerError, setScannerError] = useState("");
  const [result, setResult] = useState<EventPass | null>(null);
  const [paymentOverrideArmed, setPaymentOverrideArmed] = useState(false);

  const passQuery = useEventPassVerification(
    scanTarget?.slug ?? slug,
    scanTarget?.token ?? "",
    Boolean(scanTarget && !scanTarget.wrongEvent),
  );

  useEffect(() => {
    const initialValue =
      searchParams.get("pass") ?? searchParams.get("token") ?? "";
    if (!initialValue) return;
    setManualValue(initialValue);
    verifyInput(initialValue);
  }, []);

  useEffect(() => {
    if (passQuery.data) {
      setResult(passQuery.data);
      setScanMessage(
        passQuery.data.participant.checkedInAt
          ? "This participant is already checked in."
          : "Valid event pass.",
      );
      setPaymentOverrideArmed(false);
    }
  }, [passQuery.data]);

  useEffect(() => {
    if (passQuery.error) {
      setResult(null);
      setScanMessage(
        getApiErrorStatus(passQuery.error) === 403
          ? "You are not allowed to verify this event pass."
          : "This event pass is invalid or expired.",
      );
    }
  }, [passQuery.error]);

  useEffect(() => {
    return () => stopScanner();
  }, []);

  const verifyInput = (value: string) => {
    const parsed = parseEventPassScanValue(value, slug);
    setPaymentOverrideArmed(false);
    setResult(null);
    if (!parsed) {
      setScanTarget(null);
      setScanMessage("Invalid QR content.");
      return;
    }
    if (parsed.wrongEvent) {
      setScanTarget(parsed);
      setScanMessage("This pass belongs to a different event.");
      return;
    }
    setScanTarget(parsed);
    setScanMessage("Verifying event pass...");
  };

  const startScanner = async () => {
    if (!videoRef.current) return;
    setScannerError("");
    setScanMessage("");
    try {
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      const reader = new BrowserQRCodeReader(undefined, {
        delayBetweenScanAttempts: 500,
      });
      const devices = await BrowserQRCodeReader.listVideoInputDevices();
      const rearCamera =
        devices.find((device) =>
          /back|rear|environment/i.test(device.label || ""),
        ) ?? devices[0];
      scannerControlsRef.current = await reader.decodeFromVideoDevice(
        rearCamera?.deviceId,
        videoRef.current,
        (scanResult) => {
          const text = scanResult?.getText();
          if (!text || text === lastScanRef.current) return;
          lastScanRef.current = text;
          setManualValue(text);
          verifyInput(text);
        },
      );
      setScannerActive(true);
    } catch (error) {
      setScannerActive(false);
      setScannerError(
        error instanceof Error
          ? error.message
          : "Camera is unavailable or permission was denied.",
      );
    }
  };

  const stopScanner = () => {
    scannerControlsRef.current?.stop();
    scannerControlsRef.current = null;
    setScannerActive(false);
  };

  const handleCheckIn = () => {
    if (!scanTarget || scanTarget.wrongEvent || !result) return;
    const paymentStatus = getPassPaymentStatus(result);
    const requiresPaymentWarning =
      paymentStatus !== "verified" && paymentStatus !== "not_required";
    if (requiresPaymentWarning && !paymentOverrideArmed) {
      setPaymentOverrideArmed(true);
      return;
    }
    checkInMutation.mutate(
      { slug: scanTarget.slug, token: scanTarget.token },
      {
        onSuccess: (pass) => {
          setResult(pass);
          setScanMessage(
            pass.alreadyCheckedIn
              ? "This participant is already checked in."
              : "Checked in successfully.",
          );
          setPaymentOverrideArmed(false);
        },
        onError: (error) => {
          setScanMessage(
            getApiErrorMessage(error, "Check-in failed. Try again."),
          );
        },
      },
    );
  };

  const participants =
    participantsQuery.data?.participants ??
    participantsQuery.data?.attendees ??
    [];
  const recentCheckIns = [...participants]
    .filter((participant) => participant.checkedInAt)
    .sort((left, right) =>
      (right.checkedInAt ?? "").localeCompare(left.checkedInAt ?? ""),
    )
    .slice(0, 8);

  if (eventQuery.isLoading) {
    return (
      <CommunityPageShell>
        <CommunityHeader
          title="Check-in scanner"
          subtitle="Loading event."
          navigation={<BackButton />}
        />
        <Skeleton className="h-80 w-full rounded-xl" />
      </CommunityPageShell>
    );
  }

  if (eventQuery.error || !event) {
    return (
      <CommunityPageShell>
        <CommunityHeader
          title="Check-in scanner"
          subtitle="Event unavailable."
          navigation={<BackButton />}
        />
        <StatusPanel
          title="Event unavailable"
          description={getApiErrorMessage(
            eventQuery.error,
            "This event could not be opened.",
          )}
        />
      </CommunityPageShell>
    );
  }

  if (!event.viewerCanManage) {
    return (
      <CommunityPageShell>
        <CommunityHeader
          title="Check-in scanner"
          subtitle="Organizer access required."
          navigation={<BackToEventButton event={event} />}
        />
        <StatusPanel
          title="Organizer access required"
          description="Only event organizers can check in participants."
        />
      </CommunityPageShell>
    );
  }

  return (
    <CommunityPageShell>
      <CommunityHeader
        title={event.title}
        subtitle="Check in participants"
        navigation={
          <Button
            size="sm"
            variant="outline"
            nativeButton={false}
            render={
              <Link
                href={`/events/${encodeURIComponent(event.slug)}/manage#participants`}
              />
            }
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to manage
          </Button>
        }
        action={
          <Button
            size="sm"
            variant="outline"
            nativeButton={false}
            render={
              <Link
                href={`/events/${encodeURIComponent(event.slug)}/manage#participants`}
              />
            }
          >
            View participants
          </Button>
        }
      />

      <div className="mx-auto grid max-w-3xl gap-5">
        <section className="rounded-xl border border-border/70 bg-background/70 p-4">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-foreground">
              Check-in scanner
            </h2>
            <p className="text-sm leading-6 text-muted-foreground">
              Scan an Event Pass QR code to verify and check in a participant.
            </p>
          </div>
          <div className="mt-4 overflow-hidden rounded-lg border border-border/70 bg-black">
            <video
              ref={videoRef}
              className="aspect-square w-full object-cover sm:aspect-video"
              muted
              playsInline
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {scannerActive ? (
              <Button size="sm" variant="outline" onClick={stopScanner}>
                Stop scanner
              </Button>
            ) : (
              <Button size="sm" onClick={startScanner}>
                <QrCode className="mr-1 h-4 w-4" />
                Start scanner
              </Button>
            )}
          </div>
          {scannerError ? (
            <p className="mt-2 text-sm text-destructive">{scannerError}</p>
          ) : null}
        </section>

        <section className="rounded-xl border border-border/70 bg-background/70 p-4">
          <h2 className="text-base font-semibold text-foreground">
            Manual entry
          </h2>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Input
              value={manualValue}
              onChange={(item) => setManualValue(item.target.value)}
              placeholder="Paste Event Pass URL or token"
            />
            <Button
              className="sm:w-32"
              disabled={!manualValue.trim()}
              onClick={() => verifyInput(manualValue)}
            >
              Verify
            </Button>
          </div>
        </section>

        <CheckInResultPanel
          event={event}
          result={result}
          isVerifying={passQuery.isFetching}
          message={scanMessage}
          wrongEvent={Boolean(scanTarget?.wrongEvent)}
          paymentOverrideArmed={paymentOverrideArmed}
          isCheckingIn={checkInMutation.isPending}
          onCheckIn={handleCheckIn}
        />

        <section className="rounded-xl border border-border/70 bg-background/70 p-4">
          <h2 className="text-base font-semibold text-foreground">
            Recent check-ins
          </h2>
          {participantsQuery.isLoading ? (
            <div className="mt-3 space-y-2">
              <Skeleton className="h-12 rounded-lg" />
              <Skeleton className="h-12 rounded-lg" />
            </div>
          ) : recentCheckIns.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              No check-ins yet.
            </p>
          ) : (
            <div className="mt-3 divide-y divide-border/70 border-y border-border/70">
              {recentCheckIns.map((participant) => {
                const paymentStatus =
                  participant.payment?.status ??
                  (requiresEventPayment(event)
                    ? "pending_upload"
                    : "not_required");
                return (
                  <div
                    key={participant.id}
                    className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <UserIdentityHeader
                      displayName={
                        participant.displayName ||
                        participant.username ||
                        participant.userId
                      }
                      username={participant.username}
                      avatarUrl={participant.avatarUrl}
                      usernameFallback="participant"
                    />
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge
                        variant="outline"
                        className={getParticipantRoleBadgeClass(
                          participant.role,
                        )}
                      >
                        {titleCase(participant.role)}
                      </Badge>
                      {shouldShowPaymentStatus(paymentStatus) ? (
                        <Badge
                          variant="outline"
                          className={getPaymentStatusBadgeClass(paymentStatus)}
                        >
                          {getPaymentStatusLabel(paymentStatus)}
                        </Badge>
                      ) : null}
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(participant.checkedInAt)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </CommunityPageShell>
  );
}

export function EventPassVerificationClient({
  slug,
  token,
}: {
  slug: string;
  token: string;
}) {
  const passQuery = useEventPassVerification(slug, token);
  const pass = passQuery.data;

  if (passQuery.isLoading) {
    return (
      <CommunityPageShell>
        <CommunityHeader
          title="Event pass"
          subtitle="Loading verification details."
          navigation={<BackButton />}
        />
        <Skeleton className="h-80 w-full rounded-xl" />
      </CommunityPageShell>
    );
  }

  if (passQuery.error || !pass) {
    const status = getApiErrorStatus(passQuery.error);
    return (
      <CommunityPageShell>
        <CommunityHeader
          title="Event pass"
          subtitle="Verification"
          navigation={<BackButton />}
        />
        <StatusPanel
          title={
            status === 403
              ? "Restricted event pass"
              : "Invalid or expired event pass"
          }
          description={
            status === 403
              ? "This event pass can only be viewed by the pass owner or event organizers."
              : "Invalid or expired event pass."
          }
        />
      </CommunityPageShell>
    );
  }
  const paymentStatus =
    pass.payment?.status ??
    (requiresEventPayment(pass.event) ? "pending_upload" : "not_required");

  return (
    <CommunityPageShell>
      <CommunityHeader
        title={
          pass.canManage && !pass.isOwner ? "Valid event pass" : "My event pass"
        }
        subtitle={pass.event.title}
        navigation={<BackToEventButton event={pass.event} />}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge
            variant="outline"
            className="h-5 border-emerald-500/30 bg-emerald-500/10 px-2 text-[11px] text-emerald-700"
          >
            {pass.valid ? "Valid event pass" : "Invalid event pass"}
          </Badge>
          <Badge
            variant="outline"
            className={getParticipantRoleBadgeClass(pass.role)}
          >
            {titleCase(pass.role)}
          </Badge>
          <Badge
            variant="outline"
            className={getParticipantStatusBadgeClass(pass.status)}
          >
            {titleCase(pass.status)}
          </Badge>
          {shouldShowPaymentStatus(paymentStatus) ? (
            <Badge
              variant="outline"
              className={getPaymentStatusBadgeClass(paymentStatus)}
            >
              {getPaymentStatusLabel(paymentStatus)}
            </Badge>
          ) : null}
          {pass.participant.checkedInAt ? (
            <Badge
              variant="outline"
              className="h-5 border-sky-500/30 bg-sky-500/10 px-2 text-[11px] text-sky-700"
            >
              Checked in
            </Badge>
          ) : null}
        </div>
      </CommunityHeader>
      <DetailSection title="Verification details">
        <div className="space-y-5">
          <UserIdentityHeader
            displayName={
              pass.participant.displayName ||
              pass.participant.username ||
              pass.participant.userId
            }
            username={pass.participant.username}
            avatarUrl={pass.participant.avatarUrl}
            usernameFallback="participant"
          />
          <EventPassQRCode
            value={getEventPassUrl(pass.event, pass.participant)}
          />
          <div className="grid gap-2 text-sm">
            <PassDetail label="Event" value={pass.event.title} />
            <PassDetail
              label="Date"
              value={formatEventDate(
                pass.event.startsAt,
                pass.event.endsAt,
                pass.event.timezone,
              )}
            />
            <PassDetail
              label="Location"
              value={formatEventLocation(pass.event)}
            />
            <PassDetail label="Role" value={titleCase(pass.participant.role)} />
            <PassDetail
              label="Attendance status"
              value={titleCase(pass.participant.status)}
            />
            <PassDetail
              label="Payment status"
              value={getPaymentStatusLabel(paymentStatus)}
            />
            <PassDetail
              label="Checked-in status"
              value={
                pass.participant.checkedInAt ? "Checked in" : "Not checked in"
              }
            />
            {pass.participant.checkedInAt ? (
              <PassDetail
                label="Checked-in time"
                value={formatDateTime(pass.participant.checkedInAt)}
              />
            ) : null}
          </div>
          {pass.canManage && !pass.participant.checkedInAt ? (
            <Button
              size="sm"
              nativeButton={false}
              render={
                <Link
                  href={`/events/${encodeURIComponent(pass.event.slug)}/manage/check-in?token=${encodeURIComponent(pass.participant.qrToken ?? "")}`}
                />
              }
            >
              Check in
            </Button>
          ) : null}
        </div>
      </DetailSection>
    </CommunityPageShell>
  );
}

export function EventCompetitionPrizesClient({
  eventSlug,
  competitionSlug,
}: {
  eventSlug: string;
  competitionSlug: string;
}) {
  const eventQuery = useEvent(eventSlug);
  const event = eventQuery.data;
  const eventId = event?.id ?? "";
  const canFetchDetailExtensions =
    Boolean(eventId) &&
    Boolean(event) &&
    (event?.visibility === "public" ||
      event?.viewerCanViewPrivateDetails ||
      event?.viewerCanManage);
  const competitionsQuery = useEventCompetitions(
    eventId,
    canFetchDetailExtensions,
  );
  const prizesQuery = useEventPrizes(eventId, canFetchDetailExtensions);
  const competitions = competitionsQuery.data ?? [];
  const competition = competitions.find(
    (item) =>
      getCompetitionUrlSlug(item) === competitionSlug ||
      item.id === competitionSlug,
  );
  const prizes = (prizesQuery.data ?? []).filter(
    (prize) => prize.competitionId === competition?.id,
  );

  if (eventQuery.isLoading) {
    return (
      <CommunityPageShell>
        <CommunityHeader
          title="Opening competition"
          subtitle="Loading competition and prize details."
          navigation={<BackButton />}
        />
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      </CommunityPageShell>
    );
  }

  if (eventQuery.error || !event) {
    return (
      <CommunityPageShell>
        <CommunityHeader
          title="Competition unavailable"
          subtitle="This competition could not be opened."
          navigation={<BackButton />}
        />
        <p className="text-sm text-destructive">
          {getApiErrorMessage(
            eventQuery.error,
            "This competition could not be opened.",
          )}
        </p>
      </CommunityPageShell>
    );
  }

  if (!canFetchDetailExtensions) {
    return (
      <CommunityPageShell>
        <CommunityHeader
          title={event.title}
          subtitle="Competition details are private."
          navigation={<BackToEventButton event={event} />}
        />
        <PrivacyNotice>
          Competition and prize details are shared after the organizer approves
          participation.
        </PrivacyNotice>
      </CommunityPageShell>
    );
  }

  if (competitionsQuery.isLoading || prizesQuery.isLoading) {
    return (
      <CommunityPageShell>
        <CommunityHeader
          title="Opening competition"
          subtitle={event.title}
          navigation={<BackToEventButton event={event} />}
        />
        <Skeleton className="h-40 w-full rounded-xl" />
      </CommunityPageShell>
    );
  }

  if (competitionsQuery.error || prizesQuery.error || !competition) {
    return (
      <CommunityPageShell>
        <CommunityHeader
          title="Competition unavailable"
          subtitle={event.title}
          navigation={<BackToEventButton event={event} />}
        />
        <p className="text-sm text-destructive">
          {competition
            ? getApiErrorMessage(
                competitionsQuery.error || prizesQuery.error,
                "Competition details could not be loaded.",
              )
            : "This competition could not be found."}
        </p>
      </CommunityPageShell>
    );
  }

  return (
    <CommunityPageShell>
      <CommunityHeader
        title={competition.name}
        subtitle={event.title}
        navigation={<BackToEventButton event={event} />}
      />

      {competition.coverPhotoUrl ? (
        <img
          src={competition.coverPhotoUrl}
          alt={`${competition.name} cover photo`}
          className="aspect-[16/7] w-full rounded-xl object-cover"
        />
      ) : null}

      <Tabs defaultValue="details" orientation="horizontal" className="gap-5">
        <TabsList className={manageNestedTabsListClassName}>
          <TabsTrigger
            value="details"
            className={manageNestedTabTriggerClassName}
          >
            Details
          </TabsTrigger>
          <TabsTrigger
            value="prizes"
            className={manageNestedTabTriggerClassName}
          >
            Prizes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-5">
          <DetailSection title="Details">
            {competition.descriptionMarkdown ? (
              <ChikaMarkdown content={competition.descriptionMarkdown} />
            ) : (
              <p className="text-sm text-muted-foreground">
                No competition details have been added yet.
              </p>
            )}
          </DetailSection>
          <DetailSection title="Rules">
            {competition.rulesMarkdown ? (
              <ChikaMarkdown content={competition.rulesMarkdown} />
            ) : (
              <p className="text-sm text-muted-foreground">
                No rules have been added yet.
              </p>
            )}
          </DetailSection>
        </TabsContent>

        <TabsContent value="prizes" className="space-y-5">
          <DetailSection title="Prizes">
            <PrizeList
              event={event}
              prizes={prizes}
              onEdit={() => undefined}
              readOnly
            />
          </DetailSection>
        </TabsContent>
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

function BackToEventButton({ event }: { event: Event }) {
  return (
    <Button
      size="sm"
      variant="outline"
      nativeButton={false}
      render={<Link href={`/events/${encodeURIComponent(event.slug)}`} />}
    >
      <ArrowLeft className="mr-1 h-4 w-4" />
      Back to event
    </Button>
  );
}

function BackToManageButton({ event }: { event: Event }) {
  return (
    <Button
      size="sm"
      variant="outline"
      nativeButton={false}
      render={
        <Link
          href={`/events/${encodeURIComponent(event.slug)}/manage#payment`}
        />
      }
    >
      <ArrowLeft className="mr-1 h-4 w-4" />
      Manage event
    </Button>
  );
}

function isEventManageTab(value: string): value is EventManageTab {
  return manageNavItems.some((item) => item.value === value);
}

function EventCoverPhoto({ event }: { event: Event }) {
  const updateEventMutation = useUpdateEvent();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const previewUrl = useMemo(
    () => (photoFile ? URL.createObjectURL(photoFile) : ""),
    [photoFile],
  );

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const displayUrl = removePhoto ? "" : previewUrl || event.coverPhotoUrl || "";

  const saveCover = async () => {
    setIsUploading(true);
    try {
      let coverPhotoUrl = removePhoto ? "" : event.coverPhotoUrl || "";
      if (photoFile) {
        const upload = await mediaApi.upload(
          photoFile,
          "event_attachment",
          event.id,
        );
        coverPhotoUrl = upload.objectKey;
      }
      await updateEventMutation.mutateAsync({
        eventId: event.id,
        data: { coverPhotoUrl },
      });
      toast.success("Event cover photo saved.");
      setDialogOpen(false);
      setPhotoFile(null);
      setRemovePhoto(false);
    } catch (item) {
      toast.error(getApiErrorMessage(item, "Failed to save cover photo"));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      {event.coverPhotoUrl ? (
        <img
          src={event.coverPhotoUrl}
          alt={`${event.title} cover photo`}
          className="aspect-[16/7] w-full object-cover"
        />
      ) : (
        <div className="flex aspect-[16/7] w-full items-center justify-center bg-muted/45 px-4 text-center text-sm text-muted-foreground">
          {event.viewerCanManage
            ? "Add a cover photo for this event."
            : "Event cover photo coming soon."}
        </div>
      )}
      {event.viewerCanManage ? (
        <div className="absolute right-2 bottom-2">
          <Button
            size="sm"
            variant="secondary"
            className="h-8 bg-background/90 shadow-sm backdrop-blur"
            onClick={() => setDialogOpen(true)}
          >
            <ImageIcon className="mr-1 h-4 w-4" />
            {event.coverPhotoUrl ? "Edit cover" : "Add cover photo"}
          </Button>
        </div>
      ) : null}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setPhotoFile(null);
            setRemovePhoto(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Event cover photo</DialogTitle>
            <DialogDescription>
              Upload a JPG, PNG, or WebP image for the event page cover.
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-hidden rounded-2xl border border-border bg-muted/45">
            {displayUrl ? (
              <img
                src={displayUrl}
                alt={`${event.title} cover photo preview`}
                className="aspect-[16/7] w-full object-cover"
              />
            ) : (
              <div className="flex aspect-[16/7] w-full items-center justify-center text-sm text-muted-foreground">
                No cover photo selected.
              </div>
            )}
          </div>
          <SetupField label="Upload photo">
            <Input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(item) => {
                const file = item.target.files?.[0] ?? null;
                if (
                  file &&
                  !["image/jpeg", "image/png", "image/webp"].includes(file.type)
                ) {
                  toast.error("Upload a JPG, PNG, or WebP image.");
                  item.target.value = "";
                  setPhotoFile(null);
                  return;
                }
                setPhotoFile(file);
                setRemovePhoto(false);
              }}
            />
          </SetupField>
          <DialogFooter showCloseButton>
            {event.coverPhotoUrl ? (
              <Button
                variant="outline"
                disabled={isUploading || updateEventMutation.isPending}
                onClick={() => {
                  setPhotoFile(null);
                  setRemovePhoto(true);
                }}
              >
                Remove photo
              </Button>
            ) : null}
            <Button
              disabled={
                isUploading ||
                updateEventMutation.isPending ||
                (!photoFile && !removePhoto)
              }
              onClick={() => void saveCover()}
            >
              {isUploading || updateEventMutation.isPending
                ? "Saving..."
                : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EventHeader({
  event,
  canSeePrivateDetails,
  canShowJoinPanel,
  canShowPaymentTab,
  isSignedIn,
  onSelectTab,
  onJoinAction,
  onLeave,
  isLeaving,
}: {
  event: Event;
  canSeePrivateDetails: boolean;
  canShowJoinPanel: boolean;
  canShowPaymentTab: boolean;
  isSignedIn: boolean;
  onSelectTab: (tab: EventTab) => void;
  onJoinAction: () => void;
  onLeave: () => void;
  isLeaving: boolean;
}) {
  const privateLocked = event.visibility === "private" && !canSeePrivateDetails;
  const eventPassParticipant = canShowEventPass(event.viewerParticipation)
    ? event.viewerParticipation
    : null;
  const subtitle =
    event.shortDescription ||
    (canSeePrivateDetails
      ? "Details from the organizer are below."
      : "This is a private event. Details are limited until you are approved.");
  const viewerPaymentStatus =
    event.viewerPayment?.status ??
    (requiresEventPayment(event) ? "pending_upload" : "not_required");
  const chips: Array<{ label: string; className: string }> = privateLocked
    ? [
        {
          label: "Private event",
          className: getEventVisibilityBadgeClass(event.visibility),
        },
        ...(event.requiresApproval
          ? [
              {
                label: "Approval required",
                className: getEventAccessBadgeClass(true),
              },
            ]
          : []),
      ]
    : [
        ...(event.type
          ? [
              {
                label: eventOptionLabel(event.type),
                className: getEventTypeBadgeClass(),
              },
            ]
          : []),
        ...(event.difficulty
          ? [
              {
                label: titleCase(event.difficulty),
                className: getEventDifficultyBadgeClass(event.difficulty),
              },
            ]
          : []),
        {
          label: event.visibility === "private" ? "Private" : "Public",
          className: getEventVisibilityBadgeClass(event.visibility),
        },
        {
          label: formatEventPriceLabel(event),
          className: getEventPriceBadgeClass(event),
        },
        ...(event.viewerParticipation
          ? [
              {
                label:
                  getViewerStateLabel(event.viewerEventState) ??
                  titleCase(event.viewerParticipation.status),
                className: getParticipantStatusBadgeClass(
                  event.viewerParticipation.status,
                ),
              },
            ]
          : []),
        ...(event.viewerJoined &&
        (requiresEventPayment(event) || event.viewerPayment) &&
        shouldShowPaymentStatus(viewerPaymentStatus)
          ? [
              {
                label: getPaymentStatusLabel(viewerPaymentStatus),
                className: getPaymentStatusBadgeClass(viewerPaymentStatus),
              },
            ]
          : []),
      ];

  return (
    <CommunityHeader
      title={event.title}
      subtitle={subtitle}
      navigation={<BackButton />}
      action={
        <HeaderAction
          event={event}
          canShowJoinPanel={canShowJoinPanel}
          canShowPaymentTab={canShowPaymentTab}
          isSignedIn={isSignedIn}
          onSelectTab={onSelectTab}
          onJoinAction={onJoinAction}
          onLeave={onLeave}
          isLeaving={isLeaving}
        />
      }
      beforeTitle={<EventCoverPhoto event={event} />}
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {chips.map((chip, index) => (
              <Badge
                key={`${chip.label}-${index}`}
                variant="outline"
                className={chip.className}
              >
                {chip.label}
              </Badge>
            ))}
          </div>
          {eventPassParticipant ? (
            <EventPassDialog
              event={event}
              participant={eventPassParticipant}
              triggerClassName="h-8"
            />
          ) : null}
        </div>
        {privateLocked ? (
          <div className="grid gap-2 text-sm text-muted-foreground">
            <MetaLine icon={<Lock className="h-4 w-4" />}>
              Details are shared after you join.
            </MetaLine>
          </div>
        ) : (
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
        )}
      </div>
    </CommunityHeader>
  );
}

function HeaderAction({
  event,
  canShowJoinPanel,
  canShowPaymentTab,
  isSignedIn,
  onSelectTab,
  onJoinAction,
  onLeave,
  isLeaving,
}: {
  event: Event;
  canShowJoinPanel: boolean;
  canShowPaymentTab: boolean;
  isSignedIn: boolean;
  onSelectTab: (tab: EventTab) => void;
  onJoinAction: () => void;
  onLeave: () => void;
  isLeaving: boolean;
}) {
  if (event.viewerCanManage) {
    return (
      <Button
        size="sm"
        nativeButton={false}
        render={
          <Link href={`/events/${encodeURIComponent(event.slug)}/manage`} />
        }
      >
        <Pencil className="mr-1 h-4 w-4" />
        Manage
      </Button>
    );
  }

  if (!isSignedIn) {
    return (
      <SignInButton mode="modal">
        <Button size="sm">Sign in to join</Button>
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

  if (event.viewerJoined) {
    return (
      <AlertDialog>
        <AlertDialogTrigger
          render={
            <Button
              size="xs"
              variant="destructive"
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
            <AlertDialogAction onClick={onLeave}>Leave event</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  if (canShowJoinPanel) {
    return (
      <Button size="sm" onClick={onJoinAction}>
        Join
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
  const privateLocked = event.visibility === "private" && !canSeePrivateDetails;
  const hasDescription =
    Boolean(event.descriptionMarkdown?.trim()) ||
    Boolean(event.description?.trim()) ||
    Boolean(event.shortDescription?.trim());
  const freedivingDetails = getFreedivingDetails(event);
  const logisticsSections = getLogisticsSections(event, canSeePrivateDetails);
  const hasMissingDetails =
    event.viewerCanManage && hasOrganizerMissingDetails(event);

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
        event.viewerCanManage ? (
          <DetailSection title="About">
            <p className="text-sm leading-6 text-muted-foreground">
              Add a full event description.
            </p>
          </DetailSection>
        ) : null
      ) : null}

      {privateLocked ? (
        <PrivacyNotice>
          Private event details, payment instructions, and attendee identities
          are shared only after you are approved.
        </PrivacyNotice>
      ) : (
        <>
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
              {event.type ? (
                <Badge className="h-6 px-2 text-[11px]">
                  {eventOptionLabel(event.type)}
                </Badge>
              ) : null}
              {event.difficulty ? (
                <Badge variant="outline" className="h-6 px-2 text-[11px]">
                  {titleCase(event.difficulty)}
                </Badge>
              ) : null}
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
        </>
      )}

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
        <Button
          size="sm"
          variant="link"
          className="h-auto px-0"
          nativeButton={false}
          render={
            <Link href={`/events/${encodeURIComponent(event.slug)}/manage`} />
          }
        >
          Manage details
        </Button>
      ) : null}
    </div>
  );
}

function PhotoUploadField({
  label,
  imageUrl,
  selectedFile,
  onFileChange,
  onRemove,
  alt,
  variant = "cover",
}: {
  label: string;
  imageUrl: string;
  selectedFile: File | null;
  onFileChange: (file: File | null) => void;
  onRemove: () => void;
  alt: string;
  variant?: "cover" | "thumbnail";
}) {
  const previewUrl = useMemo(
    () => (selectedFile ? URL.createObjectURL(selectedFile) : ""),
    [selectedFile],
  );

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const displayUrl = previewUrl || imageUrl;
  const imageClass =
    variant === "thumbnail"
      ? "h-24 w-24 rounded-lg object-cover"
      : "aspect-[16/7] w-full rounded-xl object-cover";

  return (
    <div className="grid gap-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {displayUrl ? (
        <img src={displayUrl} alt={alt} className={imageClass} />
      ) : (
        <div
          className={
            variant === "thumbnail"
              ? "flex h-24 w-24 items-center justify-center rounded-lg border border-dashed border-border bg-muted/40 text-muted-foreground"
              : "flex aspect-[16/7] w-full items-center justify-center rounded-xl border border-dashed border-border bg-muted/40 text-sm text-muted-foreground"
          }
        >
          <ImageIcon className="h-5 w-5" />
        </div>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-label={label}
          onChange={(item) => {
            const file = item.target.files?.[0] ?? null;
            if (
              file &&
              !["image/jpeg", "image/png", "image/webp"].includes(file.type)
            ) {
              toast.error("Upload a JPG, PNG, or WebP image.");
              item.target.value = "";
              onFileChange(null);
              return;
            }
            onFileChange(file);
          }}
        />
        {displayUrl ? (
          <Button type="button" variant="outline" onClick={onRemove}>
            Remove photo
          </Button>
        ) : null}
      </div>
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
  joinAnswers,
  setJoinAnswers,
  joinFormFields,
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
  joinAnswers: Record<string, string>;
  setJoinAnswers: (value: Record<string, string>) => void;
  joinFormFields: EventJoinFormField[];
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
  const canUseInterest =
    event.visibility !== "private" ||
    event.viewerCanViewPrivateDetails ||
    event.viewerCanManage;
  const canToggleInterest =
    isSignedIn &&
    event.interestedEnabled &&
    canUseInterest &&
    event.status === "published" &&
    ["none", "interested", "rejected", "left", "cancelled"].includes(
      viewerState,
    );
  const canJoin = !event.viewerParticipation;
  const stateLabel = getViewerStateLabel(viewerState) ?? "Not joined";
  const paymentStatus = getPaymentStatusLabel(
    event.viewerPayment?.status ??
      (requiresEventPayment(event) ? "pending_upload" : "not_required"),
  );
  const showViewerPaymentStatus =
    event.viewerJoined &&
    (requiresEventPayment(event) || Boolean(event.viewerPayment));

  return (
    <div className="space-y-4">
      <StatusPanel
        title={stateLabel}
        description={
          showViewerPaymentStatus
            ? `Payment: ${paymentStatus}`
            : acceptsEventPayments(event)
              ? "Request to join before submitting payment."
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
                      isLeaving ||
                      event.viewerParticipation?.role === "organizer"
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
                {joinFormFields
                  .filter((field) => field.enabled)
                  .map((field) => (
                    <SetupField
                      key={field.fieldKey}
                      label={`${field.label}${field.required ? " *" : ""}`}
                    >
                      {field.fieldType === "long_text" ? (
                        <Textarea
                          value={joinAnswers[field.fieldKey] ?? ""}
                          onChange={(item) =>
                            setJoinAnswers({
                              ...joinAnswers,
                              [field.fieldKey]: item.target.value,
                            })
                          }
                        />
                      ) : (
                        <Input
                          type={
                            field.fieldType === "email"
                              ? "email"
                              : field.fieldType === "phone"
                                ? "tel"
                                : "text"
                          }
                          value={joinAnswers[field.fieldKey] ?? ""}
                          onChange={(item) =>
                            setJoinAnswers({
                              ...joinAnswers,
                              [field.fieldKey]: item.target.value,
                            })
                          }
                        />
                      )}
                    </SetupField>
                  ))}
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

function PrizesTab({
  event,
  competitions,
  prizes,
  isLoading,
  error,
  readOnly = false,
}: {
  event: Event;
  competitions: EventCompetition[];
  prizes: EventPrize[];
  isLoading: boolean;
  error: unknown;
  readOnly?: boolean;
}) {
  const createCompetitionMutation = useCreateEventCompetition();
  const updateCompetitionMutation = useUpdateEventCompetition();
  const deleteCompetitionMutation = useDeleteEventCompetition();
  const createPrizeMutation = useCreateEventPrize();
  const updatePrizeMutation = useUpdateEventPrize();
  const deletePrizeMutation = useDeleteEventPrize();
  const [competitionDialogOpen, setCompetitionDialogOpen] = useState(false);
  const [prizeDialogOpen, setPrizeDialogOpen] = useState(false);
  const [editingCompetition, setEditingCompetition] =
    useState<EventCompetition | null>(null);
  const [editingPrize, setEditingPrize] = useState<EventPrize | null>(null);
  const [competitionName, setCompetitionName] = useState("");
  const [competitionDescription, setCompetitionDescription] = useState("");
  const [competitionRules, setCompetitionRules] = useState("");
  const [competitionCoverPhotoUrl, setCompetitionCoverPhotoUrl] = useState("");
  const [competitionCoverFile, setCompetitionCoverFile] = useState<File | null>(
    null,
  );
  const [prizeTitle, setPrizeTitle] = useState("");
  const [prizeCompetitionId, setPrizeCompetitionId] = useState("general");
  const [prizePlacement, setPrizePlacement] =
    useState<EventPrizePlacement>("custom");
  const [prizePlacementLabel, setPrizePlacementLabel] = useState("");
  const [prizeType, setPrizeType] = useState<EventPrizeType | "">("");
  const [prizeAmount, setPrizeAmount] = useState("");
  const [prizeDescription, setPrizeDescription] = useState("");
  const [prizePhotoUrl, setPrizePhotoUrl] = useState("");
  const [prizePhotoFile, setPrizePhotoFile] = useState<File | null>(null);
  const [isUploadingPrizeMedia, setIsUploadingPrizeMedia] = useState(false);

  const openCompetitionDialog = (competition?: EventCompetition) => {
    setEditingCompetition(competition ?? null);
    setCompetitionName(competition?.name ?? "");
    setCompetitionDescription(competition?.descriptionMarkdown ?? "");
    setCompetitionRules(competition?.rulesMarkdown ?? "");
    setCompetitionCoverPhotoUrl(competition?.coverPhotoUrl ?? "");
    setCompetitionCoverFile(null);
    setCompetitionDialogOpen(true);
  };
  const openPrizeDialog = (prize?: EventPrize) => {
    setEditingPrize(prize ?? null);
    setPrizeTitle(prize?.title ?? "");
    setPrizeCompetitionId(prize?.competitionId ?? "general");
    setPrizePlacement(prize?.placement ?? "custom");
    setPrizePlacementLabel(prize?.placementLabel ?? "");
    setPrizeType(prize?.prizeType ?? "");
    setPrizeAmount(prize?.amount != null ? String(prize.amount) : "");
    setPrizeDescription(prize?.descriptionMarkdown ?? "");
    setPrizePhotoUrl(prize?.photoUrl ?? "");
    setPrizePhotoFile(null);
    setPrizeDialogOpen(true);
  };
  const saveCompetition = async () => {
    const name = competitionName.trim();
    if (!name) {
      toast.error("Competition name is required.");
      return;
    }
    setIsUploadingPrizeMedia(true);
    try {
      let coverPhotoUrl = competitionCoverPhotoUrl.trim();
      if (competitionCoverFile) {
        const upload = await mediaApi.upload(
          competitionCoverFile,
          "event_attachment",
          event.id,
        );
        coverPhotoUrl = upload.objectKey;
      }
      const data = {
        name,
        descriptionMarkdown: competitionDescription.trim() || undefined,
        rulesMarkdown: competitionRules.trim() || undefined,
        coverPhotoUrl: coverPhotoUrl || undefined,
      };
      if (editingCompetition) {
        await updateCompetitionMutation.mutateAsync({
          eventId: event.id,
          competitionId: editingCompetition.id,
          data: {
            ...data,
            descriptionMarkdown: competitionDescription.trim() || "",
            rulesMarkdown: competitionRules.trim() || "",
            coverPhotoUrl,
          },
        });
      } else {
        await createCompetitionMutation.mutateAsync({
          eventId: event.id,
          data,
        });
      }
      toast.success("Competition saved.");
      setCompetitionDialogOpen(false);
      setCompetitionCoverFile(null);
    } catch (item) {
      toast.error(getApiErrorMessage(item, "Failed to save competition"));
    } finally {
      setIsUploadingPrizeMedia(false);
    }
  };
  const savePrize = async () => {
    const title = prizeTitle.trim();
    if (!title) {
      toast.error("Prize title is required.");
      return;
    }
    const amount = prizeAmount.trim()
      ? Number.parseFloat(prizeAmount.trim())
      : undefined;
    if (amount !== undefined && (!Number.isFinite(amount) || amount < 0)) {
      toast.error("Prize amount must be zero or higher.");
      return;
    }
    setIsUploadingPrizeMedia(true);
    try {
      let photoUrl = prizePhotoUrl.trim();
      if (prizePhotoFile) {
        const upload = await mediaApi.upload(
          prizePhotoFile,
          "event_attachment",
          event.id,
        );
        photoUrl = upload.objectKey;
      }
      const createData: CreateEventPrizeRequest = {
        title,
        competitionId:
          prizeCompetitionId === "general" ? undefined : prizeCompetitionId,
        placement: prizePlacement,
        placementLabel: prizePlacementLabel.trim() || undefined,
        prizeType: prizeType || undefined,
        amount,
        descriptionMarkdown: prizeDescription.trim() || undefined,
        photoUrl: photoUrl || undefined,
      };
      if (editingPrize) {
        const updateData: UpdateEventPrizeRequest = {
          ...createData,
          competitionId:
            prizeCompetitionId === "general" ? "" : prizeCompetitionId,
          placementLabel: prizePlacementLabel.trim() || "",
          prizeType: prizeType || "",
          descriptionMarkdown: prizeDescription.trim() || "",
          photoUrl,
        };
        await updatePrizeMutation.mutateAsync({
          eventId: event.id,
          prizeId: editingPrize.id,
          data: updateData,
        });
      } else {
        await createPrizeMutation.mutateAsync({
          eventId: event.id,
          data: createData,
        });
      }
      toast.success("Prize saved.");
      setPrizeDialogOpen(false);
      setPrizePhotoFile(null);
    } catch (item) {
      toast.error(getApiErrorMessage(item, "Failed to save prize"));
    } finally {
      setIsUploadingPrizeMedia(false);
    }
  };

  const generalPrizes = prizes.filter((prize) => !prize.competitionId);
  const prizesByCompetition = new Map<string, EventPrize[]>();
  for (const prize of prizes) {
    if (!prize.competitionId) continue;
    const items = prizesByCompetition.get(prize.competitionId) ?? [];
    items.push(prize);
    prizesByCompetition.set(prize.competitionId, items);
  }
  const isEmpty = readOnly
    ? competitions.length === 0
    : competitions.length === 0 && prizes.length === 0;

  if (isLoading) {
    return <Skeleton className="h-32 rounded-xl" />;
  }
  if (error) {
    return (
      <p className="text-sm text-destructive">
        {getApiErrorMessage(
          error,
          readOnly
            ? "Competitions could not be loaded."
            : "Competitions and prizes could not be loaded.",
        )}
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <DetailSection
        title={readOnly ? "Competitions" : "Competitions & Prizes"}
      >
        {event.viewerCanManage && readOnly ? (
          <Button
            size="sm"
            variant="outline"
            nativeButton={false}
            render={
              <Link
                href={`/events/${encodeURIComponent(event.slug)}/manage#awards`}
              />
            }
          >
            Manage competitions & prizes
          </Button>
        ) : null}
        {event.viewerCanManage && !readOnly ? (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => openCompetitionDialog()}>
              <Plus className="mr-1 h-4 w-4" />
              Add competition
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => openPrizeDialog()}
            >
              <Award className="mr-1 h-4 w-4" />
              Add prize
            </Button>
          </div>
        ) : null}
      </DetailSection>

      {isEmpty ? (
        <CommunityEmptyState
          title="No competitions have been added yet."
          description={
            event.viewerCanManage
              ? "Add competitions for this event."
              : "No competitions have been added yet."
          }
        />
      ) : (
        <div className="space-y-6">
          {competitions.length > 0 ? (
            readOnly ? (
              <CompetitionList
                event={event}
                competitions={competitions}
                prizesByCompetition={prizesByCompetition}
                readOnly={readOnly}
              />
            ) : (
              <DetailSection title="Competitions">
                <CompetitionList
                  event={event}
                  competitions={competitions}
                  prizesByCompetition={prizesByCompetition}
                  onEdit={
                    event.viewerCanManage && !readOnly
                      ? openCompetitionDialog
                      : undefined
                  }
                  onEditPrize={
                    event.viewerCanManage && !readOnly
                      ? openPrizeDialog
                      : undefined
                  }
                  readOnly={readOnly}
                />
              </DetailSection>
            )
          ) : null}
          {!readOnly && generalPrizes.length > 0 ? (
            <DetailSection title="Event prizes">
              <PrizeList
                event={event}
                prizes={generalPrizes}
                onEdit={
                  event.viewerCanManage && !readOnly
                    ? openPrizeDialog
                    : undefined
                }
                readOnly={readOnly}
              />
            </DetailSection>
          ) : null}
        </div>
      )}

      <Dialog
        open={competitionDialogOpen}
        onOpenChange={setCompetitionDialogOpen}
      >
        <DialogContent className="max-w-2xl!">
          <DialogHeader>
            <DialogTitle>
              {editingCompetition ? "Edit competition" : "Add competition"}
            </DialogTitle>
            <DialogDescription>
              Add contests like photography, static, dynamic, or custom awards.
            </DialogDescription>
          </DialogHeader>
          <SetupField label="Name">
            <Input
              value={competitionName}
              onChange={(item) => setCompetitionName(item.target.value)}
              placeholder="Underwater Photography"
            />
          </SetupField>
          <PhotoUploadField
            label="Upload competition cover photo"
            imageUrl={competitionCoverPhotoUrl}
            selectedFile={competitionCoverFile}
            onFileChange={setCompetitionCoverFile}
            onRemove={() => {
              setCompetitionCoverPhotoUrl("");
              setCompetitionCoverFile(null);
            }}
            alt={`${competitionName || "Competition"} cover photo`}
          />
          <SetupField label="Description">
            <MarkdownEditor
              value={competitionDescription}
              onChange={setCompetitionDescription}
              minRows={5}
              maxLength={10000}
            />
          </SetupField>
          <SetupField label="Rules">
            <MarkdownEditor
              value={competitionRules}
              onChange={setCompetitionRules}
              minRows={5}
              maxLength={10000}
            />
          </SetupField>
          <DialogFooter showCloseButton>
            {editingCompetition ? (
              <Button
                variant="outline"
                disabled={
                  isUploadingPrizeMedia || deleteCompetitionMutation.isPending
                }
                onClick={() =>
                  deleteCompetitionMutation.mutate(
                    {
                      eventId: event.id,
                      competitionId: editingCompetition.id,
                    },
                    {
                      onSuccess: () => {
                        toast.success("Competition removed.");
                        setCompetitionDialogOpen(false);
                      },
                      onError: (item) =>
                        toast.error(
                          getApiErrorMessage(
                            item,
                            "Failed to remove competition",
                          ),
                        ),
                    },
                  )
                }
              >
                <Trash2 className="mr-1 h-4 w-4" />
                Delete
              </Button>
            ) : null}
            <Button
              disabled={
                isUploadingPrizeMedia ||
                createCompetitionMutation.isPending ||
                updateCompetitionMutation.isPending
              }
              onClick={() => void saveCompetition()}
            >
              {isUploadingPrizeMedia ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={prizeDialogOpen} onOpenChange={setPrizeDialogOpen}>
        <DialogContent className="max-w-2xl!">
          <DialogHeader>
            <DialogTitle>
              {editingPrize ? "Edit prize" : "Add prize"}
            </DialogTitle>
            <DialogDescription>
              Link the prize to a competition or keep it as a general event
              award.
            </DialogDescription>
          </DialogHeader>
          <SetupField label="Title">
            <Input
              value={prizeTitle}
              onChange={(item) => setPrizeTitle(item.target.value)}
              placeholder="Champion"
            />
          </SetupField>
          <PhotoUploadField
            label="Upload prize photo"
            imageUrl={prizePhotoUrl}
            selectedFile={prizePhotoFile}
            onFileChange={setPrizePhotoFile}
            onRemove={() => {
              setPrizePhotoUrl("");
              setPrizePhotoFile(null);
            }}
            alt={`${prizeTitle || "Prize"} prize photo`}
            variant="thumbnail"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <SetupField label="Competition">
              <Select
                value={prizeCompetitionId}
                items={[
                  { value: "general", label: "General event prize" },
                  ...competitions.map((competition) => ({
                    value: competition.id,
                    label: competition.name,
                  })),
                ]}
                onValueChange={(value) =>
                  setPrizeCompetitionId(value ?? "general")
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General event prize</SelectItem>
                  {competitions.map((competition) => (
                    <SelectItem key={competition.id} value={competition.id}>
                      {competition.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SetupField>
            <SetupField label="Placement">
              <Select
                value={prizePlacement}
                items={prizePlacementOptions}
                onValueChange={(value) =>
                  setPrizePlacement(value as EventPrizePlacement)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {prizePlacementOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SetupField>
          </div>
          <SetupField label="Custom placement label">
            <Input
              value={prizePlacementLabel}
              onChange={(item) => setPrizePlacementLabel(item.target.value)}
              placeholder="People's Choice"
            />
          </SetupField>
          <div className="grid gap-3 sm:grid-cols-2">
            <SetupField label="Type">
              <Select
                value={prizeType || "none"}
                items={[
                  { value: "none", label: "Not set" },
                  ...prizeTypeOptions,
                ]}
                onValueChange={(value) =>
                  setPrizeType(
                    value === "none" ? "" : (value as EventPrizeType),
                  )
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not set</SelectItem>
                  {prizeTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SetupField>
            <SetupField label="Amount">
              <Input
                type="number"
                min={0}
                step="0.01"
                value={prizeAmount}
                onChange={(item) => setPrizeAmount(item.target.value)}
              />
            </SetupField>
          </div>
          <SetupField label="Description">
            <MarkdownEditor
              value={prizeDescription}
              onChange={setPrizeDescription}
              minRows={5}
              maxLength={10000}
            />
          </SetupField>
          <DialogFooter showCloseButton>
            {editingPrize ? (
              <Button
                variant="outline"
                disabled={
                  isUploadingPrizeMedia || deletePrizeMutation.isPending
                }
                onClick={() =>
                  deletePrizeMutation.mutate(
                    { eventId: event.id, prizeId: editingPrize.id },
                    {
                      onSuccess: () => {
                        toast.success("Prize removed.");
                        setPrizeDialogOpen(false);
                      },
                      onError: (item) =>
                        toast.error(
                          getApiErrorMessage(item, "Failed to remove prize"),
                        ),
                    },
                  )
                }
              >
                <Trash2 className="mr-1 h-4 w-4" />
                Delete
              </Button>
            ) : null}
            <Button
              disabled={
                isUploadingPrizeMedia ||
                createPrizeMutation.isPending ||
                updatePrizeMutation.isPending
              }
              onClick={() => void savePrize()}
            >
              {isUploadingPrizeMedia ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PrizeList({
  event,
  prizes,
  onEdit,
  readOnly = false,
}: {
  event: Event;
  prizes: EventPrize[];
  onEdit?: (prize: EventPrize) => void;
  readOnly?: boolean;
}) {
  if (prizes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No prizes have been added yet.
      </p>
    );
  }
  return (
    <div className="divide-y divide-border/70 border-y border-border/70">
      {prizes.map((prize) => (
        <article key={prize.id} className="py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              {prize.photoUrl ? (
                <img
                  src={prize.photoUrl}
                  alt={`${prize.title} prize photo`}
                  className="h-16 w-16 shrink-0 rounded-lg object-cover"
                />
              ) : null}
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge className="h-6 px-2 text-[11px]">
                    {prizePlacementLabel(prize)}
                  </Badge>
                  {prize.prizeType ? (
                    <Badge variant="outline" className="h-6 px-2 text-[11px]">
                      {titleCase(prize.prizeType)}
                    </Badge>
                  ) : null}
                  {prize.amount != null ? (
                    <Badge variant="outline" className="h-6 px-2 text-[11px]">
                      {formatPeso(prize.amount)}
                    </Badge>
                  ) : null}
                </div>
                <h3 className="text-sm font-medium text-foreground">
                  {prize.title}
                </h3>
              </div>
            </div>
            {event.viewerCanManage && !readOnly && onEdit ? (
              <Button size="sm" variant="outline" onClick={() => onEdit(prize)}>
                Edit prize
              </Button>
            ) : null}
          </div>
          {prize.descriptionMarkdown ? (
            <ChikaMarkdown
              content={prize.descriptionMarkdown}
              className="mt-2"
            />
          ) : null}
        </article>
      ))}
    </div>
  );
}

function CompetitionList({
  event,
  competitions,
  prizesByCompetition,
  onEdit,
  onEditPrize,
  readOnly = false,
}: {
  event: Event;
  competitions: EventCompetition[];
  prizesByCompetition: Map<string, EventPrize[]>;
  onEdit?: (competition: EventCompetition) => void;
  onEditPrize?: (prize: EventPrize) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="divide-y divide-border/70 border-y border-border/70">
      {competitions.map((competition) => {
        const competitionPrizes = prizesByCompetition.get(competition.id) ?? [];
        const prizeCount = competitionPrizes.length;
        return (
          <article key={competition.id} className="py-3">
            {competition.coverPhotoUrl ? (
              <img
                src={competition.coverPhotoUrl}
                alt={`${competition.name} cover photo`}
                className="mb-3 aspect-[16/7] w-full rounded-xl object-cover"
              />
            ) : null}
            <div className="flex items-start justify-between gap-3">
              <Link
                href={getCompetitionHref(event, competition)}
                className="min-w-0 flex-1 space-y-1"
              >
                <h3 className="text-sm font-medium text-foreground">
                  {competition.name}
                </h3>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline" className="h-6 px-2 text-[11px]">
                    {prizeCount} prize{prizeCount === 1 ? "" : "s"}
                  </Badge>
                </div>
              </Link>
              {onEdit ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onEdit(competition)}
                >
                  Edit
                </Button>
              ) : null}
            </div>
            {!readOnly && competitionPrizes.length > 0 ? (
              <div className="mt-3">
                <PrizeList
                  event={event}
                  prizes={competitionPrizes}
                  onEdit={onEditPrize}
                  readOnly={readOnly}
                />
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

function SponsorsTab({
  event,
  sponsors,
  isLoading,
  error,
  readOnly = false,
}: {
  event: Event;
  sponsors: EventSponsor[];
  isLoading: boolean;
  error: unknown;
  readOnly?: boolean;
}) {
  const createSponsorMutation = useCreateEventSponsor();
  const updateSponsorMutation = useUpdateEventSponsor();
  const deleteSponsorMutation = useDeleteEventSponsor();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState<EventSponsor | null>(
    null,
  );
  const [name, setName] = useState("");
  const [tier, setTier] = useState<EventSponsorTier | "">("");
  const [description, setDescription] = useState("");
  const [logoMediaId, setLogoMediaId] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [socialUrl, setSocialUrl] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const openDialog = (sponsor?: EventSponsor) => {
    setEditingSponsor(sponsor ?? null);
    setName(sponsor?.name ?? "");
    setTier(sponsor?.tier ?? "");
    setDescription(sponsor?.description ?? "");
    setLogoMediaId(sponsor?.logoMediaId ?? "");
    setLogoFile(null);
    setWebsiteUrl(sponsor?.websiteUrl ?? "");
    setSocialUrl(sponsor?.socialUrl ?? "");
    setContactName(sponsor?.contactName ?? "");
    setContactEmail(sponsor?.contactEmail ?? "");
    setDialogOpen(true);
  };
  const saveSponsor = async () => {
    const sponsorName = name.trim();
    if (!sponsorName) {
      toast.error("Sponsor name is required.");
      return;
    }
    setIsUploadingLogo(true);
    try {
      let uploadedLogoMediaId = logoMediaId.trim();
      if (logoFile) {
        const upload = await mediaApi.upload(
          logoFile,
          "event_attachment",
          event.id,
        );
        uploadedLogoMediaId = upload.id;
      }
      const createData: CreateEventSponsorRequest = {
        name: sponsorName,
        tier: tier || undefined,
        description: description.trim() || undefined,
        logoMediaId: uploadedLogoMediaId || undefined,
        websiteUrl: websiteUrl.trim() || undefined,
        socialUrl: socialUrl.trim() || undefined,
        contactName: contactName.trim() || undefined,
        contactEmail: contactEmail.trim() || undefined,
        isActive: true,
      };
      const options = {
        onSuccess: () => {
          toast.success("Sponsor saved.");
          setDialogOpen(false);
        },
        onError: (item: unknown) =>
          toast.error(getApiErrorMessage(item, "Failed to save sponsor")),
      };
      if (editingSponsor) {
        const updateData: UpdateEventSponsorRequest = {
          ...createData,
          tier: tier || "",
          description: description.trim() || "",
          logoMediaId: uploadedLogoMediaId || "",
          websiteUrl: websiteUrl.trim() || "",
          socialUrl: socialUrl.trim() || "",
          contactName: contactName.trim() || "",
          contactEmail: contactEmail.trim() || "",
        };
        updateSponsorMutation.mutate(
          { eventId: event.id, sponsorId: editingSponsor.id, data: updateData },
          options,
        );
        return;
      }
      createSponsorMutation.mutate(
        { eventId: event.id, data: createData },
        options,
      );
    } catch (item) {
      toast.error(getApiErrorMessage(item, "Failed to upload sponsor logo"));
    } finally {
      setIsUploadingLogo(false);
    }
  };

  if (isLoading) {
    return <Skeleton className="h-32 rounded-xl" />;
  }
  if (error) {
    return (
      <p className="text-sm text-destructive">
        {getApiErrorMessage(error, "Sponsors could not be loaded.")}
      </p>
    );
  }

  const activeSponsors = sponsors.filter((sponsor) => sponsor.isActive);
  const grouped = groupSponsorsByTier(activeSponsors);

  return (
    <div className="space-y-5">
      <DetailSection title="Sponsors">
        {event.viewerCanManage && readOnly ? (
          <Button
            size="sm"
            variant="outline"
            nativeButton={false}
            render={
              <Link
                href={`/events/${encodeURIComponent(event.slug)}/manage#sponsors`}
              />
            }
          >
            Manage sponsors
          </Button>
        ) : null}
        {event.viewerCanManage && !readOnly ? (
          <Button size="sm" onClick={() => openDialog()}>
            <Plus className="mr-1 h-4 w-4" />
            Add sponsor
          </Button>
        ) : null}
      </DetailSection>
      {activeSponsors.length === 0 ? (
        <CommunityEmptyState
          title="No sponsors have been added yet."
          description={
            event.viewerCanManage
              ? "Add sponsor logos, links, and private organizer contacts."
              : "No sponsors have been added yet."
          }
        />
      ) : (
        <div className="space-y-6">
          {grouped.map(([groupTier, items]) => (
            <DetailSection key={groupTier} title={sponsorTierLabel(groupTier)}>
              <div className="grid gap-3 sm:grid-cols-2">
                {items.map((sponsor) => {
                  const websiteUrl = safeExternalUrl(sponsor.websiteUrl);
                  const socialUrl = safeExternalUrl(sponsor.socialUrl);
                  return (
                    <article
                      key={sponsor.id}
                      className="rounded-lg border border-border/70 p-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border/70 bg-muted/40">
                          {sponsor.logoUrl ? (
                            <img
                              src={sponsor.logoUrl}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Handshake className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1 space-y-1">
                          <h3 className="text-sm font-medium text-foreground">
                            {sponsor.name}
                          </h3>
                          {sponsor.description ? (
                            <p className="text-sm leading-6 text-muted-foreground">
                              {sponsor.description}
                            </p>
                          ) : null}
                          <div className="flex flex-wrap gap-2 text-xs">
                            {websiteUrl ? (
                              <a
                                className="text-primary underline underline-offset-4"
                                href={websiteUrl}
                                target="_blank"
                                rel="noreferrer noopener"
                              >
                                Website
                              </a>
                            ) : null}
                            {socialUrl ? (
                              <a
                                className="text-primary underline underline-offset-4"
                                href={socialUrl}
                                target="_blank"
                                rel="noreferrer noopener"
                              >
                                Social
                              </a>
                            ) : null}
                          </div>
                          {event.viewerCanManage &&
                          !readOnly &&
                          (sponsor.contactName || sponsor.contactEmail) ? (
                            <p className="text-xs text-muted-foreground">
                              {[sponsor.contactName, sponsor.contactEmail]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      {event.viewerCanManage && !readOnly ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-3"
                          onClick={() => openDialog(sponsor)}
                        >
                          Edit sponsor
                        </Button>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </DetailSection>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl!">
          <DialogHeader>
            <DialogTitle>
              {editingSponsor ? "Edit sponsor" : "Add sponsor"}
            </DialogTitle>
            <DialogDescription>
              Public fields are shown to event viewers. Contact fields stay
              organizer-only.
            </DialogDescription>
          </DialogHeader>
          <SetupField label="Name">
            <Input
              value={name}
              onChange={(item) => setName(item.target.value)}
            />
          </SetupField>
          <SetupField label="Tier">
            <Select
              value={tier || "none"}
              items={[
                { value: "none", label: "Not set" },
                ...sponsorTierOptions,
              ]}
              onValueChange={(value) =>
                setTier(value === "none" ? "" : (value as EventSponsorTier))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not set</SelectItem>
                {sponsorTierOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SetupField>
          <SetupField label="Description">
            <Textarea
              className="min-h-20"
              value={description}
              onChange={(item) => setDescription(item.target.value)}
            />
          </SetupField>
          <div className="grid gap-3 sm:grid-cols-2">
            <SetupField label="Logo media ID">
              <Input
                value={logoMediaId}
                onChange={(item) => setLogoMediaId(item.target.value)}
              />
            </SetupField>
            <SetupField label="Upload logo">
              <Input
                type="file"
                accept="image/*"
                onChange={(item) => setLogoFile(item.target.files?.[0] ?? null)}
              />
            </SetupField>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <SetupField label="Website">
              <Input
                value={websiteUrl}
                onChange={(item) => setWebsiteUrl(item.target.value)}
                placeholder="https://"
              />
            </SetupField>
            <SetupField label="Social">
              <Input
                value={socialUrl}
                onChange={(item) => setSocialUrl(item.target.value)}
                placeholder="https://"
              />
            </SetupField>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <SetupField label="Private contact name">
              <Input
                value={contactName}
                onChange={(item) => setContactName(item.target.value)}
              />
            </SetupField>
            <SetupField label="Private contact email">
              <Input
                value={contactEmail}
                onChange={(item) => setContactEmail(item.target.value)}
              />
            </SetupField>
          </div>
          <DialogFooter showCloseButton>
            {editingSponsor ? (
              <Button
                variant="outline"
                disabled={deleteSponsorMutation.isPending}
                onClick={() =>
                  deleteSponsorMutation.mutate(
                    { eventId: event.id, sponsorId: editingSponsor.id },
                    {
                      onSuccess: () => {
                        toast.success("Sponsor removed.");
                        setDialogOpen(false);
                      },
                      onError: (item) =>
                        toast.error(
                          getApiErrorMessage(item, "Failed to remove sponsor"),
                        ),
                    },
                  )
                }
              >
                <Trash2 className="mr-1 h-4 w-4" />
                Delete
              </Button>
            ) : null}
            <Button
              disabled={
                isUploadingLogo ||
                createSponsorMutation.isPending ||
                updateSponsorMutation.isPending
              }
              onClick={() => void saveSponsor()}
            >
              {isUploadingLogo ? "Uploading..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProgramTab({
  event,
  items,
  isLoading,
  error,
}: {
  event: Event;
  items: EventProgramItem[];
  isLoading: boolean;
  error: unknown;
}) {
  if (isLoading) {
    return <Skeleton className="h-32 w-full rounded-xl" />;
  }
  if (error) {
    return (
      <Card className="border-destructive/30 bg-destructive/5 py-0">
        <CardContent className="p-3 text-sm text-destructive">
          {getApiErrorMessage(error, "Program could not be loaded.")}
        </CardContent>
      </Card>
    );
  }
  if (items.length === 0) {
    return (
      <CommunityEmptyState
        title="No program has been added yet."
        description={
          event.viewerCanManage
            ? "Add the event flow, activities, or schedule from Manage."
            : "Check back later for activities and schedule details."
        }
      />
    );
  }
  const groups = groupProgramItems(items);
  return (
    <DetailSection title="Program">
      <div className="divide-y divide-border/70 border-y border-border/70">
        {groups.map((group) => (
          <div
            key={group.label}
            className="grid gap-3 py-4 md:grid-cols-[160px_minmax(0,1fr)]"
          >
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {group.label}
            </div>
            <div className="space-y-4">
              {group.items.map((item) => (
                <ProgramItemRow key={item.id} item={item} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </DetailSection>
  );
}

function ProgramItemRow({ item }: { item: EventProgramItem }) {
  return (
    <div className="grid gap-2 sm:grid-cols-[90px_minmax(0,1fr)]">
      <div className="text-sm font-medium text-muted-foreground">
        {formatProgramTime(item)}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">
            {item.title}
          </h3>
          {item.isHighlighted ? (
            <Badge variant="secondary" className="h-5 px-2 text-[11px]">
              Highlight
            </Badge>
          ) : null}
          {item.competitionName ? (
            <Badge variant="outline" className="h-5 px-2 text-[11px]">
              {item.competitionName}
            </Badge>
          ) : null}
        </div>
        {item.locationLabel ? (
          <p className="mt-1 text-xs text-muted-foreground">
            {item.locationLabel}
          </p>
        ) : null}
        {item.descriptionMarkdown ? (
          <div className="mt-2 text-sm leading-6 text-muted-foreground">
            <ChikaMarkdown content={item.descriptionMarkdown} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ProgramManageSection({
  event,
  items,
  competitions,
  isLoading,
  error,
}: {
  event: Event;
  items: EventProgramItem[];
  competitions: EventCompetition[];
  isLoading: boolean;
  error: unknown;
}) {
  const updateModulesMutation = useUpdateEventModules();
  const createMutation = useCreateEventProgramItem();
  const updateMutation = useUpdateEventProgramItem();
  const deleteMutation = useDeleteEventProgramItem();
  const [dialogItem, setDialogItem] = useState<EventProgramItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [orderedItems, setOrderedItems] = useState<EventProgramItem[]>([]);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  useEffect(() => {
    setOrderedItems([...items].sort(compareProgramManageItems));
  }, [items]);
  const persistOrder = (nextItems: EventProgramItem[]) => {
    nextItems.forEach((programItem, index) => {
      if (programItem.sortOrder === index) return;
      updateMutation.mutate(
        {
          eventId: event.id,
          programItemId: programItem.id,
          data: { sortOrder: index },
        },
        {
          onError: (error) =>
            toast.error(getApiErrorMessage(error, "Failed to reorder Program")),
        },
      );
    });
  };
  const handleDragEnd = (dragEvent: DragEndEvent) => {
    const { active, over } = dragEvent;
    if (!over || active.id === over.id) return;
    const oldIndex = orderedItems.findIndex(
      (programItem) => programItem.id === active.id,
    );
    const newIndex = orderedItems.findIndex(
      (programItem) => programItem.id === over.id,
    );
    if (oldIndex < 0 || newIndex < 0) return;
    const nextItems = arrayMove(orderedItems, oldIndex, newIndex);
    setOrderedItems(nextItems);
    persistOrder(nextItems);
  };
  const saveModuleState = (enabled: boolean) =>
    updateModulesMutation.mutate(
      {
        eventId: event.id,
        data: { modules: { ...event.modules, program: enabled } },
      },
      {
        onSuccess: () => toast.success("Program settings saved."),
        onError: (item) =>
          toast.error(getApiErrorMessage(item, "Failed to update Program")),
      },
    );
  return (
    <Tabs defaultValue="items" orientation="horizontal" className="gap-4">
      <TabsList variant="line" className={manageNestedTabsListClassName}>
        <TabsTrigger value="items" className={manageNestedTabTriggerClassName}>
          Items
        </TabsTrigger>
        <TabsTrigger
          value="settings"
          className={manageNestedTabTriggerClassName}
        >
          Settings
        </TabsTrigger>
      </TabsList>
      <TabsContent value="items" className="space-y-4">
        <DetailSection title="Program items">
          <div className="mb-3 flex justify-end">
            <Button
              size="sm"
              onClick={() => {
                setDialogItem(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="mr-1 h-4 w-4" />
              Add item
            </Button>
          </div>
          {isLoading ? <Skeleton className="h-24 w-full rounded-xl" /> : null}
          {error ? (
            <Card className="border-destructive/30 bg-destructive/5 py-0">
              <CardContent className="p-3 text-sm text-destructive">
                {getApiErrorMessage(error, "Program could not be loaded.")}
              </CardContent>
            </Card>
          ) : null}
          {!isLoading && !error && items.length === 0 ? (
            <CommunityEmptyState
              title="No program items yet"
              description="Add activities, itinerary entries, or highlighted moments."
            />
          ) : null}
          {orderedItems.length > 0 ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={orderedItems.map((programItem) => programItem.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="divide-y divide-border/70 border-y border-border/70">
                  {orderedItems.map((item) => (
                    <SortableProgramItemRow
                      key={item.id}
                      item={item}
                      disabled={updateMutation.isPending}
                      onEdit={() => {
                        setDialogItem(item);
                        setDialogOpen(true);
                      }}
                      onDelete={() =>
                        deleteMutation.mutate(
                          { eventId: event.id, programItemId: item.id },
                          {
                            onSuccess: () =>
                              toast.success("Program item deleted."),
                            onError: (error) =>
                              toast.error(
                                getApiErrorMessage(
                                  error,
                                  "Failed to delete item",
                                ),
                              ),
                          },
                        )
                      }
                      deleteDisabled={deleteMutation.isPending}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : null}
        </DetailSection>
        <ProgramItemDialog
          event={event}
          item={dialogItem}
          competitions={competitions}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          isSaving={createMutation.isPending || updateMutation.isPending}
          onSave={(payload) => {
            if (dialogItem) {
              updateMutation.mutate(
                {
                  eventId: event.id,
                  programItemId: dialogItem.id,
                  data: payload,
                },
                {
                  onSuccess: () => {
                    toast.success("Program item saved.");
                    setDialogOpen(false);
                  },
                  onError: (error) =>
                    toast.error(
                      getApiErrorMessage(error, "Failed to save item"),
                    ),
                },
              );
              return;
            }
            createMutation.mutate(
              {
                eventId: event.id,
                data: {
                  ...(payload as CreateEventProgramItemRequest),
                  sortOrder: orderedItems.length,
                },
              },
              {
                onSuccess: () => {
                  toast.success("Program item added.");
                  setDialogOpen(false);
                },
                onError: (error) =>
                  toast.error(getApiErrorMessage(error, "Failed to add item")),
              },
            );
          }}
        />
      </TabsContent>
      <TabsContent value="settings" className="space-y-4">
        <DetailSection title="Program settings">
          <label className="flex cursor-pointer items-start gap-3 border-y border-border/70 py-3 text-sm">
            <input
              className="mt-1"
              type="checkbox"
              checked={event.programEnabled}
              disabled={updateModulesMutation.isPending}
              onChange={(item) => saveModuleState(item.target.checked)}
            />
            <span>
              <span className="font-medium text-foreground">
                Enable Program
              </span>
              <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                When enabled, participants can see the Program tab on the event
                page. Disabling it hides the Program tab but keeps existing
                items.
              </span>
            </span>
          </label>
        </DetailSection>
      </TabsContent>
    </Tabs>
  );
}

function SortableProgramItemRow({
  item,
  disabled,
  deleteDisabled,
  onEdit,
  onDelete,
}: {
  item: EventProgramItem;
  disabled: boolean;
  deleteDisabled: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex flex-col gap-3 bg-background py-3 sm:flex-row sm:items-start sm:justify-between",
        isDragging && "relative z-10 shadow-sm",
      )}
    >
      <div className="flex min-w-0 flex-1 gap-2">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="mt-0.5 h-8 w-8 shrink-0 cursor-grab text-muted-foreground active:cursor-grabbing"
          aria-label={`Reorder ${item.title}`}
          disabled={disabled}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </Button>
        <ProgramItemRow item={item} />
      </div>
      <div className="flex shrink-0 gap-2 pl-10 sm:pl-0">
        <Button size="sm" variant="outline" onClick={onEdit}>
          Edit
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={deleteDisabled}
          onClick={onDelete}
        >
          Delete
        </Button>
      </div>
    </div>
  );
}

function ProgramItemDialog({
  event,
  item,
  competitions,
  open,
  onOpenChange,
  isSaving,
  onSave,
}: {
  event: Event;
  item: EventProgramItem | null;
  competitions: EventCompetition[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSaving: boolean;
  onSave: (
    payload: CreateEventProgramItemRequest | UpdateEventProgramItemRequest,
  ) => void;
}) {
  const [form, setForm] = useState<CreateEventProgramItemRequest>(() =>
    programItemToForm(item, event),
  );
  useEffect(() => {
    if (open) setForm(programItemToForm(item, event));
  }, [event, item, open]);
  const update = <K extends keyof CreateEventProgramItemRequest>(
    key: K,
    value: CreateEventProgramItemRequest[K],
  ) => setForm((current) => ({ ...current, [key]: value }));
  const competitionItems = [
    { value: "none", label: "No linked competition" },
    ...competitions.map((competition) => ({
      value: competition.id,
      label: competition.name,
    })),
  ];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl!">
        <DialogHeader>
          <DialogTitle>
            {item ? "Edit program item" : "Add program item"}
          </DialogTitle>
          <DialogDescription>
            Use date and time for itinerary entries. Leave them blank for simple
            activities.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <SetupField label="Title">
            <Input
              value={form.title}
              onChange={(next) => update("title", next.target.value)}
            />
          </SetupField>
          <SetupField label="Description">
            <Textarea
              value={form.descriptionMarkdown ?? ""}
              onChange={(next) =>
                update("descriptionMarkdown", next.target.value)
              }
            />
          </SetupField>
          <div className="grid gap-3 sm:grid-cols-3">
            <SetupField label="Date">
              <DatePicker
                value={dateStringToDate(form.programDate)}
                onSelect={(date) =>
                  update("programDate", dateToDateString(date))
                }
              />
            </SetupField>
            <SetupField label="Starts">
              <Input
                type="time"
                value={form.startTime ?? ""}
                onChange={(next) => update("startTime", next.target.value)}
              />
            </SetupField>
            <SetupField label="Ends">
              <Input
                type="time"
                value={form.endTime ?? ""}
                onChange={(next) => update("endTime", next.target.value)}
              />
            </SetupField>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <SetupField label="Location">
              <Input
                value={form.locationLabel ?? ""}
                onChange={(next) => update("locationLabel", next.target.value)}
              />
            </SetupField>
            <SetupField label="Linked competition">
              <Select
                value={form.competitionId || "none"}
                items={competitionItems}
                onValueChange={(value) =>
                  update(
                    "competitionId",
                    value && value !== "none" ? value : "",
                  )
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {competitionItems.map((competition) => (
                    <SelectItem
                      key={competition.value}
                      value={competition.value}
                    >
                      {competition.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SetupField>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(form.isHighlighted)}
              onChange={(next) => update("isHighlighted", next.target.checked)}
            />
            Highlight this item
          </label>
        </div>
        <DialogFooter showCloseButton>
          <Button disabled={isSaving} onClick={() => onSave(form)}>
            {isSaving ? "Saving..." : "Save item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PostsTab({
  event,
  posts,
  isLoading,
  error,
  isSignedIn,
  mode = "manage",
}: {
  event: Event;
  posts: EventPost[];
  isLoading: boolean;
  error: unknown;
  isSignedIn: boolean;
  mode?: "public" | "manage";
}) {
  const createPostMutation = useCreateEventPost();
  const updatePostMutation = useUpdateEventPost();
  const deletePostMutation = useDeleteEventPost();
  const addFishReactionMutation = useAddEventPostFishReaction();
  const deleteFishReactionMutation = useDeleteEventPostFishReaction();
  const updateSettingsMutation = useUpdateEventPostSettings();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<EventPost | null>(null);
  const [postType, setPostType] = useState<EventPostType>("general");
  const [title, setTitle] = useState("");
  const [bodyMarkdown, setBodyMarkdown] = useState("");
  const isManageMode = mode === "manage";
  const canCreatePost = event.postsEnabled && event.viewerCanManage;

  const openDialog = (post?: EventPost) => {
    setEditingPost(post ?? null);
    setPostType(post?.postType ?? "general");
    setTitle(post?.title ?? "");
    setBodyMarkdown(post?.bodyMarkdown ?? "");
    setDialogOpen(true);
  };
  const savePost = () => {
    const body = bodyMarkdown.trim();
    if (!body) {
      toast.error("Update body is required.");
      return;
    }
    const data = {
      postType,
      title: title.trim() || undefined,
      bodyMarkdown: body,
    };
    const options = {
      onSuccess: () => {
        toast.success("Update saved.");
        setDialogOpen(false);
      },
      onError: (item: unknown) =>
        toast.error(getApiErrorMessage(item, "Failed to save update")),
    };
    if (editingPost) {
      updatePostMutation.mutate(
        { eventId: event.id, postId: editingPost.id, data },
        options,
      );
      return;
    }
    createPostMutation.mutate({ eventId: event.id, data }, options);
  };

  if (!event.postsEnabled) {
    return (
      <StatusPanel
        title="Updates are not enabled for this event."
        description={
          event.viewerCanManage
            ? "Enable Updates when you are ready to share official event announcements, reminders, and results."
            : "Updates are not enabled for this event."
        }
      >
        {event.viewerCanManage && isManageMode ? (
          <Button
            size="sm"
            disabled={updateSettingsMutation.isPending}
            onClick={() =>
              updateSettingsMutation.mutate(
                {
                  eventId: event.id,
                  data: {
                    postsEnabled: true,
                    postCreatePolicy: "organizers_only",
                  },
                },
                {
                  onSuccess: () => toast.success("Event updates enabled."),
                  onError: (item) =>
                    toast.error(
                      getApiErrorMessage(
                        item,
                        "Failed to enable event updates",
                      ),
                    ),
                },
              )
            }
          >
            Enable Updates
          </Button>
        ) : null}
      </StatusPanel>
    );
  }

  if (isLoading) {
    return <Skeleton className="h-32 rounded-xl" />;
  }
  if (error) {
    return (
      <p className="text-sm text-destructive">
        {getApiErrorMessage(error, "Event updates could not be loaded.")}
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <DetailSection title="Updates">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {isManageMode ? (
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              Share official event announcements, schedule changes, logistics,
              payment reminders, and results.
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            {canCreatePost && isManageMode ? (
              <Button size="sm" onClick={() => openDialog()}>
                <MessageSquare className="mr-1 h-4 w-4" />
                New update
              </Button>
            ) : null}
            {canCreatePost && !isManageMode ? (
              <Button
                size="sm"
                nativeButton={false}
                render={
                  <Link
                    href={`/events/${encodeURIComponent(event.slug)}/manage#updates`}
                  />
                }
              >
                <MessageSquare className="mr-1 h-4 w-4" />
                New update
              </Button>
            ) : null}
          </div>
        </div>
      </DetailSection>
      {posts.length === 0 ? (
        <CommunityEmptyState
          title="No updates yet."
          description={
            event.viewerCanManage
              ? "No updates yet. Share announcements, reminders, or schedule changes for participants."
              : "No updates yet."
          }
        />
      ) : (
        <div className="divide-y divide-border/70 border-y border-border/70">
          {posts.map((post) => {
            const canEdit = isManageMode && event.viewerCanManage;
            return (
              <article key={post.id} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className="h-6 px-2 text-[11px]">
                        {eventUpdateTypeLabel(post.postType)}
                      </Badge>
                      {post.isPinned ? (
                        <Badge className="h-6 px-2 text-[11px]">
                          <Pin className="mr-1 h-3 w-3" />
                          Pinned
                        </Badge>
                      ) : null}
                      {post.status !== "published" ? (
                        <Badge
                          variant="outline"
                          className="h-6 px-2 text-[11px]"
                        >
                          {titleCase(post.status)}
                        </Badge>
                      ) : null}
                    </div>
                    {post.title ? (
                      <h3 className="mt-1 text-sm font-medium text-foreground">
                        {post.title}
                      </h3>
                    ) : null}
                    <p className="mt-1 text-xs text-muted-foreground">
                      Posted by{" "}
                      {post.authorDisplayName ||
                        post.authorUsername ||
                        post.authorUserId}{" "}
                      · {new Date(post.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {canEdit ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openDialog(post)}
                    >
                      Edit update
                    </Button>
                  ) : null}
                </div>
                <ChikaMarkdown content={post.bodyMarkdown} className="mt-3" />
                <div className="mt-3">
                  {isSignedIn ? (
                    <Button
                      size="sm"
                      variant={
                        post.viewerHasFishReacted ? "secondary" : "outline"
                      }
                      className="h-8 px-2.5"
                      aria-label={
                        post.viewerHasFishReacted
                          ? "Remove fish reaction"
                          : "React with fish"
                      }
                      disabled={
                        addFishReactionMutation.isPending ||
                        deleteFishReactionMutation.isPending
                      }
                      onClick={() => {
                        const variables = {
                          eventId: event.id,
                          postId: post.id,
                        };
                        if (post.viewerHasFishReacted) {
                          deleteFishReactionMutation.mutate(variables, {
                            onError: (item) =>
                              toast.error(
                                getApiErrorMessage(
                                  item,
                                  "Failed to remove fish reaction",
                                ),
                              ),
                          });
                        } else {
                          addFishReactionMutation.mutate(variables, {
                            onError: (item) =>
                              toast.error(
                                getApiErrorMessage(
                                  item,
                                  "Failed to react with fish",
                                ),
                              ),
                          });
                        }
                      }}
                    >
                      🐟 {post.fishReactionCount}
                    </Button>
                  ) : (
                    <SignInButton mode="modal">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2.5"
                        aria-label="Sign in to react with fish"
                      >
                        🐟 {post.fishReactionCount}
                      </Button>
                    </SignInButton>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl!">
          <DialogHeader>
            <DialogTitle>
              {editingPost ? "Edit update" : "New update"}
            </DialogTitle>
            <DialogDescription>
              Share an official event announcement, reminder, schedule change,
              or result.
            </DialogDescription>
          </DialogHeader>
          <SetupField label="Type">
            <Select
              value={postType}
              items={eventUpdateTypeOptions}
              onValueChange={(value) => setPostType(value as EventPostType)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {eventUpdateTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SetupField>
          <SetupField label="Title">
            <Input
              value={title}
              onChange={(item) => setTitle(item.target.value)}
            />
          </SetupField>
          <SetupField label="Body">
            <MarkdownEditor
              value={bodyMarkdown}
              onChange={setBodyMarkdown}
              minRows={7}
              maxLength={20000}
            />
          </SetupField>
          <DialogFooter showCloseButton>
            {editingPost ? (
              <>
                {event.viewerCanManage ? (
                  <Button
                    variant="outline"
                    disabled={updatePostMutation.isPending}
                    onClick={() =>
                      updatePostMutation.mutate(
                        {
                          eventId: event.id,
                          postId: editingPost.id,
                          data: { isPinned: !editingPost.isPinned },
                        },
                        {
                          onSuccess: () => {
                            toast.success("Update updated.");
                            setDialogOpen(false);
                          },
                          onError: (item) =>
                            toast.error(
                              getApiErrorMessage(
                                item,
                                "Failed to update event update",
                              ),
                            ),
                        },
                      )
                    }
                  >
                    {editingPost.isPinned ? "Unpin" : "Pin"}
                  </Button>
                ) : null}
                <Button
                  variant="outline"
                  disabled={deletePostMutation.isPending}
                  onClick={() =>
                    deletePostMutation.mutate(
                      { eventId: event.id, postId: editingPost.id },
                      {
                        onSuccess: () => {
                          toast.success("Update deleted.");
                          setDialogOpen(false);
                        },
                        onError: (item) =>
                          toast.error(
                            getApiErrorMessage(item, "Failed to delete update"),
                          ),
                      },
                    )
                  }
                >
                  <Trash2 className="mr-1 h-4 w-4" />
                  Delete
                </Button>
              </>
            ) : null}
            <Button
              disabled={
                createPostMutation.isPending || updatePostMutation.isPending
              }
              onClick={savePost}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
  onManagePaymentHref,
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
  onManagePaymentHref: string;
}) {
  const payment = event.viewerPayment;
  const selectedMethod =
    paymentMethods.find((method) => method.id === selectedPaymentMethodId) ??
    paymentMethods[0];
  const paymentMethodItems = paymentMethods.map((method) => ({
    value: method.id,
    label: getPaymentMethodLabel(method),
  }));

  if (!acceptsEventPayments(event)) {
    return (
      <div className="space-y-4">
        <StatusPanel
          title="No payments configured"
          description="This event does not collect fees or donations."
        />
      </div>
    );
  }

  if (event.viewerCanManage && paymentMethods.length === 0) {
    return (
      <StatusPanel
        title="Payment setup is incomplete"
        description="Add payment methods in Manage before participants can pay."
      >
        <Button
          size="sm"
          nativeButton={false}
          render={<Link href={onManagePaymentHref} />}
        >
          Set up payment
        </Button>
      </StatusPanel>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border/70 bg-background/70 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-foreground">
              {event.priceAmount == null
                ? requiresEventPayment(event)
                  ? "Payment pending"
                  : "Optional donation"
                : formatPeso(event.priceAmount)}
            </h2>
            <p className="text-sm leading-6 text-muted-foreground">
              {requiresEventPayment(event) || payment
                ? getPaymentStatusLabel(
                    payment?.status ??
                      (requiresEventPayment(event)
                        ? "pending_upload"
                        : "not_required"),
                  )
                : "Payment is optional for this event."}
            </p>
          </div>
          {payment?.proofMediaId ? (
            <Button
              size="sm"
              variant="outline"
              className="shrink-0"
              disabled={viewingPaymentProofId === payment.id}
              onClick={() => onViewPaymentProof(payment.id)}
            >
              {viewingPaymentProofId === payment.id
                ? "Opening..."
                : "View submitted proof"}
            </Button>
          ) : null}
        </div>
      </div>

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
              items={paymentMethodItems}
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
                    {getPaymentMethodLabel(method)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <PaymentMethodCustomerDisplay method={selectedMethod} />
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
                items={paymentMethodItems}
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
                      {getPaymentMethodLabel(method)}
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

type ParticipantWorkflowTab =
  | "needs-action"
  | "requests"
  | "going"
  | "payments"
  | "roles"
  | "attendance"
  | "inactive";

const participantWorkflowTabs: Array<{
  value: ParticipantWorkflowTab;
  label: string;
  emptyTitle: string;
}> = [
  {
    value: "needs-action",
    label: "Needs action",
    emptyTitle: "No action needed",
  },
  { value: "requests", label: "Requests", emptyTitle: "No pending requests" },
  { value: "going", label: "Going", emptyTitle: "No confirmed participants" },
  { value: "payments", label: "Payments", emptyTitle: "No payment reviews" },
  { value: "roles", label: "Roles", emptyTitle: "No role records" },
  {
    value: "attendance",
    label: "Attendance",
    emptyTitle: "No attendance records",
  },
  {
    value: "inactive",
    label: "Inactive",
    emptyTitle: "No inactive participants",
  },
];

function filterParticipantsForWorkflow(
  participants: EventParticipant[],
  tab: ParticipantWorkflowTab,
  event: Event,
) {
  switch (tab) {
    case "needs-action":
      return participants.filter(
        (participant) =>
          participant.status === "pending_approval" ||
          participant.payment?.status === "submitted" ||
          participant.payment?.status === "rejected" ||
          (requiresEventPayment(event) &&
            participant.status === "confirmed" &&
            (participant.payment?.status ?? "pending_upload") !== "verified"),
      );
    case "requests":
      return participants.filter(
        (participant) => participant.status === "pending_approval",
      );
    case "going":
      return participants.filter(
        (participant) =>
          participant.status === "confirmed" ||
          participant.status === "attended",
      );
    case "payments":
      return participants.filter((participant) =>
        shouldShowPaymentStatus(
          participant.payment?.status ??
            (requiresEventPayment(event) ? "pending_upload" : "not_required"),
        ),
      );
    case "roles":
      return participants.filter(
        (participant) =>
          participant.status === "confirmed" ||
          participant.status === "attended" ||
          participant.role === "organizer",
      );
    case "attendance":
      return participants.filter(
        (participant) =>
          participant.status === "confirmed" ||
          participant.status === "attended" ||
          participant.status === "no_show",
      );
    case "inactive":
      return participants.filter((participant) =>
        ["rejected", "left", "cancelled", "no_show"].includes(
          participant.status,
        ),
      );
  }
}

function ParticipantsSection({
  event,
  participants,
  isLoading,
  error,
  onApprove,
  onReject,
  onUpdateRole,
  onVerifyPayment,
  onRejectPayment,
  onViewPaymentProof,
  onRegeneratePass,
  onUpdateAttendance,
  viewingPaymentProofId,
  regeneratingPassId,
  showOrganizerActions = false,
}: {
  event: Event;
  participants: EventParticipant[];
  isLoading: boolean;
  error: unknown;
  onApprove: (participantId: string) => void;
  onReject: (participantId: string) => void;
  onUpdateRole: (
    participantId: string,
    role: "participant" | "organizer",
  ) => void;
  onVerifyPayment: (paymentId: string) => void;
  onRejectPayment: (paymentId: string) => void;
  onViewPaymentProof: (paymentId: string) => void;
  onRegeneratePass?: (participantId: string) => void;
  onUpdateAttendance?: (
    participantId: string,
    status: "attended" | "no_show" | "confirmed" | "cancelled",
  ) => void;
  viewingPaymentProofId?: string;
  regeneratingPassId?: string;
  showOrganizerActions?: boolean;
}) {
  const canShowIdentities =
    event.visibility === "public" ||
    event.viewerCanViewPrivateDetails ||
    event.viewerCanManage;
  const sortedParticipants = useMemo(
    () =>
      [...participants].sort((left, right) => {
        const roleRank = (item: EventParticipant) =>
          item.role === "organizer" ? 0 : 1;
        const byRole = roleRank(left) - roleRank(right);
        if (byRole !== 0) return byRole;
        return (left.displayName || left.username || left.userId).localeCompare(
          right.displayName || right.username || right.userId,
        );
      }),
    [participants],
  );
  const [activeParticipantTab, setActiveParticipantTab] =
    useState<ParticipantWorkflowTab>("requests");
  const organizerCount = participants.filter(
    (participant) => participant.role === "organizer",
  ).length;

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
        showOrganizerActions && event.viewerCanManage
          ? "Participants and payments"
          : "Participants"
      }
    >
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <Badge variant="outline" className="h-6 px-2 text-[11px]">
          {event.goingCount ?? event.currentAttendees} going
        </Badge>
        {showOrganizerActions ? (
          <Badge variant="outline" className="h-6 px-2 text-[11px]">
            {organizerCount} organizer{organizerCount === 1 ? "" : "s"}
          </Badge>
        ) : null}
        <Badge variant="outline" className="h-6 px-2 text-[11px]">
          {event.interestedCount ?? 0} interested
        </Badge>
        {event.viewerCanManage && !showOrganizerActions ? (
          <Button
            size="sm"
            variant="link"
            className="h-6 px-1 text-xs"
            nativeButton={false}
            render={
              <Link
                href={`/events/${encodeURIComponent(event.slug)}/manage#participants`}
              />
            }
          >
            Manage participants
          </Button>
        ) : null}
        {event.viewerCanManage && showOrganizerActions ? (
          <Button
            size="sm"
            variant="outline"
            className="h-7 rounded-full px-2 text-[11px]"
            nativeButton={false}
            render={
              <Link
                href={`/events/${encodeURIComponent(event.slug)}/manage/check-in`}
              />
            }
          >
            <QrCode className="mr-1 h-3 w-3" />
            Check in
          </Button>
        ) : null}
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
      ) : showOrganizerActions ? (
        <Tabs
          value={activeParticipantTab}
          onValueChange={(value) =>
            setActiveParticipantTab(value as ParticipantWorkflowTab)
          }
          orientation="horizontal"
          className="gap-4"
        >
          <TabsList variant="line" className={manageNestedTabsListClassName}>
            {participantWorkflowTabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className={manageNestedTabTriggerClassName}
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {participantWorkflowTabs.map((tab) => (
            <TabsContent key={tab.value} value={tab.value}>
              <ParticipantRows
                event={event}
                participants={filterParticipantsForWorkflow(
                  sortedParticipants,
                  tab.value,
                  event,
                )}
                emptyTitle={tab.emptyTitle}
                showOrganizerActions
                onApprove={onApprove}
                onReject={onReject}
                onUpdateRole={onUpdateRole}
                onVerifyPayment={onVerifyPayment}
                onRejectPayment={onRejectPayment}
                onViewPaymentProof={onViewPaymentProof}
                onRegeneratePass={onRegeneratePass}
                onUpdateAttendance={onUpdateAttendance}
                viewingPaymentProofId={viewingPaymentProofId}
                regeneratingPassId={regeneratingPassId}
              />
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <ParticipantRows
          event={event}
          participants={sortedParticipants}
          showOrganizerActions={false}
          onApprove={onApprove}
          onReject={onReject}
          onUpdateRole={onUpdateRole}
          onVerifyPayment={onVerifyPayment}
          onRejectPayment={onRejectPayment}
          onViewPaymentProof={onViewPaymentProof}
        />
      )}
    </DetailSection>
  );
}

function ParticipantRows({
  event,
  participants,
  emptyTitle = "No participants here",
  showOrganizerActions,
  onApprove,
  onReject,
  onUpdateRole,
  onVerifyPayment,
  onRejectPayment,
  onViewPaymentProof,
  onRegeneratePass,
  onUpdateAttendance,
  viewingPaymentProofId,
  regeneratingPassId,
}: {
  event: Event;
  participants: EventParticipant[];
  emptyTitle?: string;
  showOrganizerActions: boolean;
  onApprove: (participantId: string) => void;
  onReject: (participantId: string) => void;
  onUpdateRole: (
    participantId: string,
    role: "participant" | "organizer",
  ) => void;
  onVerifyPayment: (paymentId: string) => void;
  onRejectPayment: (paymentId: string) => void;
  onViewPaymentProof: (paymentId: string) => void;
  onRegeneratePass?: (participantId: string) => void;
  onUpdateAttendance?: (
    participantId: string,
    status: "attended" | "no_show" | "confirmed" | "cancelled",
  ) => void;
  viewingPaymentProofId?: string;
  regeneratingPassId?: string;
}) {
  if (participants.length === 0) {
    return (
      <CommunityEmptyState
        title={emptyTitle}
        description="Participant records will appear here when they match this view."
      />
    );
  }
  return (
    <div className="divide-y divide-border/70 border-y border-border/70">
      {participants.map((participant) => {
        const identityBadges = [
          <Badge
            key="status"
            variant="outline"
            className={getParticipantStatusBadgeClass(participant.status)}
          >
            {titleCase(participant.status)}
          </Badge>,
          <Badge
            key="role"
            variant="outline"
            className={getParticipantRoleBadgeClass(participant.role)}
          >
            {titleCase(participant.role)}
          </Badge>,
        ];
        return (
          <div key={participant.id} className="py-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <UserIdentityHeader
                displayName={
                  participant.displayName ||
                  participant.username ||
                  participant.userId
                }
                username={participant.username}
                avatarUrl={participant.avatarUrl ?? undefined}
                usernameFallback="participant"
                metadata={identityBadges}
              />
              <div className="flex flex-wrap items-center gap-1.5">
                {showOrganizerActions ? (
                  <>
                    <PaymentStatusBadge
                      payment={participant.payment}
                      fallbackStatus={
                        requiresEventPayment(event)
                          ? "pending_upload"
                          : "not_required"
                      }
                      isOpening={
                        Boolean(participant.payment?.id) &&
                        viewingPaymentProofId === participant.payment?.id
                      }
                      onViewProof={onViewPaymentProof}
                    />
                    <OrganizerActions
                      event={event}
                      participant={participant}
                      onApprove={onApprove}
                      onReject={onReject}
                      onUpdateRole={onUpdateRole}
                      onVerifyPayment={onVerifyPayment}
                      onRejectPayment={onRejectPayment}
                      onViewPaymentProof={onViewPaymentProof}
                      onRegeneratePass={onRegeneratePass}
                      onUpdateAttendance={onUpdateAttendance}
                      viewingPaymentProofId={viewingPaymentProofId}
                      regeneratingPassId={regeneratingPassId}
                    />
                    {participant.checkedInAt ? (
                      <Badge
                        variant="outline"
                        className="h-6 border-sky-500/30 bg-sky-500/10 px-2 text-[11px] text-sky-700"
                      >
                        Checked in
                      </Badge>
                    ) : null}
                  </>
                ) : null}
              </div>
            </div>
            {showOrganizerActions &&
            participant.status === "pending_approval" &&
            participant.participantNote ? (
              <p className="mt-2 rounded-lg bg-muted/40 p-2 text-sm text-muted-foreground">
                {participant.participantNote}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function OrganizerActions({
  event,
  participant,
  onApprove,
  onReject,
  onUpdateRole,
  onVerifyPayment,
  onRejectPayment,
  onViewPaymentProof,
  onRegeneratePass,
  onUpdateAttendance,
  viewingPaymentProofId,
  regeneratingPassId,
}: {
  event: Event;
  participant: EventParticipant;
  onApprove: (participantId: string) => void;
  onReject: (participantId: string) => void;
  onUpdateRole: (
    participantId: string,
    role: "participant" | "organizer",
  ) => void;
  onVerifyPayment: (paymentId: string) => void;
  onRejectPayment: (paymentId: string) => void;
  onViewPaymentProof: (paymentId: string) => void;
  onRegeneratePass?: (participantId: string) => void;
  onUpdateAttendance?: (
    participantId: string,
    status: "attended" | "no_show" | "confirmed" | "cancelled",
  ) => void;
  viewingPaymentProofId?: string;
  regeneratingPassId?: string;
}) {
  const payment = participant.payment;
  const compactButtonClassName = "h-6 rounded-full px-2 text-[11px]";
  return (
    <>
      <EventPassDialog
        event={event}
        participant={participant}
        triggerClassName={compactButtonClassName}
        onRegeneratePass={onRegeneratePass}
        regenerating={regeneratingPassId === participant.id}
      />
      {participant.qrToken ? (
        <Button
          size="sm"
          variant="outline"
          className={compactButtonClassName}
          nativeButton={false}
          render={
            <Link
              href={`/events/${encodeURIComponent(event.slug)}/manage/check-in?token=${encodeURIComponent(participant.qrToken)}`}
            />
          }
        >
          Check in
        </Button>
      ) : null}
      {participant.status === "pending_approval" ? (
        <>
          <Button
            size="sm"
            className={compactButtonClassName}
            onClick={() => onApprove(participant.id)}
          >
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            className={compactButtonClassName}
            onClick={() => onReject(participant.id)}
          >
            <XCircle className="mr-1 h-3 w-3" />
            Reject
          </Button>
        </>
      ) : null}
      {participant.status === "confirmed" ? (
        participant.role === "organizer" ? (
          <Button
            size="sm"
            variant="outline"
            className={compactButtonClassName}
            onClick={() => onUpdateRole(participant.id, "participant")}
          >
            Make participant
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className={compactButtonClassName}
            onClick={() => onUpdateRole(participant.id, "organizer")}
          >
            Make organizer
          </Button>
        )
      ) : null}
      {participant.status === "confirmed" ? (
        <>
          <Button
            size="sm"
            variant="outline"
            className={compactButtonClassName}
            onClick={() => onUpdateAttendance?.(participant.id, "attended")}
          >
            Mark attended
          </Button>
          <Button
            size="sm"
            variant="outline"
            className={compactButtonClassName}
            onClick={() => onUpdateAttendance?.(participant.id, "no_show")}
          >
            Mark no-show
          </Button>
        </>
      ) : null}
      {payment ? (
        <>
          {payment.referenceNumber ? (
            <span className="text-[11px] text-muted-foreground">
              Ref: {payment.referenceNumber}
            </span>
          ) : null}
          {payment.status === "submitted" ? (
            <>
              <Button
                size="sm"
                className={compactButtonClassName}
                onClick={() => onVerifyPayment(payment.id)}
              >
                Verify payment
              </Button>
              <Button
                size="sm"
                variant="outline"
                className={compactButtonClassName}
                onClick={() => onRejectPayment(payment.id)}
              >
                Reject payment
              </Button>
            </>
          ) : null}
        </>
      ) : null}
    </>
  );
}

function EventPassQRCode({ value }: { value: string }) {
  return (
    <div className="flex justify-center rounded-lg border border-border/70 bg-white p-4">
      <div className="relative h-[220px] w-[220px]">
        <QRCodeSVG
          value={value}
          size={220}
          level="H"
          role="img"
          aria-label="Event pass QR code"
          imageSettings={{
            src: eventPassQrLogoUrl,
            height: 52,
            width: 52,
            excavate: true,
          }}
        />
        <span className="-translate-x-1/2 -translate-y-1/2 pointer-events-none absolute top-1/2 left-1/2 flex h-12 w-12 items-center justify-center rounded-md bg-zinc-950 p-1.5 shadow-sm">
          <img
            src={eventPassQrLogoUrl}
            alt=""
            aria-hidden="true"
            className="h-full w-full object-contain"
          />
        </span>
      </div>
    </div>
  );
}

function EventPassDialog({
  event,
  participant,
  triggerClassName,
  onRegeneratePass,
  regenerating = false,
}: {
  event: Event;
  participant: EventParticipant;
  triggerClassName?: string;
  onRegeneratePass?: (participantId: string) => void;
  regenerating?: boolean;
}) {
  const passUrl = getEventPassUrl(event, participant);
  const paymentStatus =
    participant.payment?.status ??
    (requiresEventPayment(event) ? "pending_upload" : "not_required");
  const copyPassLink = async () => {
    if (!passUrl) return;
    await navigator.clipboard.writeText(passUrl);
    toast.success("Event pass link copied.");
  };

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            size="sm"
            variant="outline"
            className={triggerClassName}
            disabled={!passUrl}
          />
        }
      >
        <QrCode className="mr-1 h-3 w-3" />
        View QR
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg!">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle>Event pass</DialogTitle>
            <Badge
              variant="outline"
              className={getParticipantRoleBadgeClass(participant.role)}
            >
              {titleCase(participant.role)}
            </Badge>
          </div>
          <DialogDescription>
            {participant.displayName || participant.username || "Participant"}
          </DialogDescription>
        </DialogHeader>
        {passUrl ? (
          <div className="space-y-5">
            <EventPassQRCode value={passUrl} />
            <p className="text-center text-xs text-muted-foreground">
              Scan this QR to verify this event pass.
            </p>
            <div className="grid gap-2 text-sm">
              <PassDetail label="Event" value={event.title} />
              <PassDetail
                label="Date"
                value={formatEventDate(
                  event.startsAt,
                  event.endsAt,
                  event.timezone,
                )}
              />
              <PassDetail label="Location" value={formatEventLocation(event)} />
              <PassDetail
                label="User"
                value={
                  participant.displayName ||
                  participant.username ||
                  participant.userId
                }
              />
              <PassDetail
                label="Username"
                value={
                  participant.username ? `@${participant.username}` : "Not set"
                }
              />
              <PassDetail label="Role" value={titleCase(participant.role)} />
              <PassDetail
                label="Attendance status"
                value={titleCase(participant.status)}
              />
              <PassDetail
                label="Payment status"
                value={getPaymentStatusLabel(paymentStatus)}
              />
              <PassDetail
                label="Checked-in status"
                value={
                  participant.checkedInAt ? "Checked in" : "Not checked in"
                }
              />
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            This event member does not have an active event pass yet.
          </p>
        )}
        <DialogFooter showCloseButton>
          <Button variant="outline" disabled={!passUrl} onClick={copyPassLink}>
            <Copy className="mr-1 h-4 w-4" />
            Copy pass link
          </Button>
          {onRegeneratePass ? (
            <AlertDialog>
              <AlertDialogTrigger
                render={<Button variant="outline" disabled={regenerating} />}
              >
                <RefreshCw className="mr-1 h-4 w-4" />
                {regenerating ? "Regenerating..." : "Regenerate QR"}
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Regenerate QR?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This invalidates the current event pass link. Use it only
                    when the old QR should stop working.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onRegeneratePass(participant.id)}
                  >
                    Regenerate QR
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PassDetail({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-2 last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value || "Not set"}</span>
    </div>
  );
}

function CheckInResultPanel({
  event,
  result,
  isVerifying,
  message,
  wrongEvent,
  paymentOverrideArmed,
  isCheckingIn,
  onCheckIn,
}: {
  event: Event;
  result: EventPass | null;
  isVerifying: boolean;
  message: string;
  wrongEvent: boolean;
  paymentOverrideArmed: boolean;
  isCheckingIn: boolean;
  onCheckIn: () => void;
}) {
  const paymentStatus = result ? getPassPaymentStatus(result) : undefined;
  const paymentWarning =
    paymentStatus &&
    paymentStatus !== "verified" &&
    paymentStatus !== "not_required";
  const alreadyCheckedIn = Boolean(result?.participant.checkedInAt);

  return (
    <section className="rounded-xl border border-border/70 bg-background/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-foreground">
          Latest scan result
        </h2>
        {isVerifying ? (
          <Badge variant="outline" className="h-6 px-2 text-[11px]">
            Verifying
          </Badge>
        ) : result ? (
          <Badge
            variant="outline"
            className={
              alreadyCheckedIn
                ? "h-6 border-sky-500/30 bg-sky-500/10 px-2 text-[11px] text-sky-700"
                : "h-6 border-emerald-500/30 bg-emerald-500/10 px-2 text-[11px] text-emerald-700"
            }
          >
            {alreadyCheckedIn ? "Already checked in" : "Valid event pass"}
          </Badge>
        ) : wrongEvent ? (
          <Badge
            variant="outline"
            className="h-6 border-amber-500/30 bg-amber-500/10 px-2 text-[11px] text-amber-700"
          >
            Wrong event
          </Badge>
        ) : null}
      </div>
      {message ? (
        <p
          className={`mt-2 text-sm ${
            wrongEvent ||
            message.includes("invalid") ||
            message.includes("failed")
              ? "text-destructive"
              : "text-muted-foreground"
          }`}
        >
          {message}
        </p>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          Scan or paste an Event Pass to see participant details.
        </p>
      )}
      {result ? (
        <div className="mt-4 space-y-4">
          <UserIdentityHeader
            displayName={
              result.participant.displayName ||
              result.participant.username ||
              result.participant.userId
            }
            username={result.participant.username}
            avatarUrl={result.participant.avatarUrl}
            usernameFallback="participant"
          />
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge
              variant="outline"
              className={getParticipantRoleBadgeClass(result.role)}
            >
              {titleCase(result.role)}
            </Badge>
            <Badge
              variant="outline"
              className={getParticipantStatusBadgeClass(result.status)}
            >
              {titleCase(result.status)}
            </Badge>
            <Badge
              variant="outline"
              className={getPaymentStatusBadgeClass(
                paymentStatus ?? "pending_upload",
              )}
            >
              {getPaymentStatusLabel(paymentStatus ?? "pending_upload")}
            </Badge>
          </div>
          <div className="grid gap-2 text-sm">
            <PassDetail label="Event" value={event.title} />
            <PassDetail
              label="Checked in"
              value={
                result.participant.checkedInAt
                  ? formatDateTime(result.participant.checkedInAt)
                  : "Not checked in"
              }
            />
            {result.participant.checkedInBy ? (
              <PassDetail
                label="Checked in by"
                value={result.participant.checkedInBy}
              />
            ) : null}
          </div>
          {paymentWarning ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800">
              Payment is not verified. Check-in does not change payment status.
            </div>
          ) : null}
          <Button
            className="w-full sm:w-auto"
            disabled={alreadyCheckedIn || isCheckingIn}
            onClick={onCheckIn}
          >
            {alreadyCheckedIn
              ? "Already checked in"
              : paymentWarning && paymentOverrideArmed
                ? "Check in anyway"
                : isCheckingIn
                  ? "Checking in..."
                  : "Check in"}
          </Button>
        </div>
      ) : null}
    </section>
  );
}

function PaymentStatusBadge({
  payment,
  fallbackStatus,
  isOpening,
  onViewProof,
}: {
  payment?: EventParticipant["payment"];
  fallbackStatus: EventPaymentStatus;
  isOpening: boolean;
  onViewProof: (paymentId: string) => void;
}) {
  const status = payment?.status ?? fallbackStatus;
  if (!shouldShowPaymentStatus(status)) {
    return null;
  }
  const label = getPaymentStatusLabel(status);
  const className = getPaymentStatusBadgeClass(status);

  if (payment?.proofMediaId) {
    return (
      <button
        type="button"
        className={`${className} inline-flex items-center rounded-full border font-medium transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-60`}
        disabled={isOpening}
        onClick={() => onViewProof(payment.id)}
      >
        {isOpening ? "Opening proof..." : `${label} | Proof`}
      </button>
    );
  }

  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  );
}

function shouldShowPaymentStatus(status: EventPaymentStatus) {
  return status !== "not_required";
}

type OrganizerSetupEditor =
  | "description"
  | "schedule"
  | "capacity"
  | "fit"
  | "logistics"
  | "posts";

function ManageOverviewSection({
  event,
  participants,
  onNavigate,
  onSaved,
}: {
  event: Event;
  participants: EventParticipant[];
  onNavigate: (tab: EventManageTab) => void;
  onSaved: () => void;
}) {
  const pendingCount = participants.filter(
    (participant) => participant.status === "pending_approval",
  ).length;
  const paymentReviewCount = participants.filter(
    (participant) => participant.payment?.status === "submitted",
  ).length;
  return (
    <div className="space-y-4">
      <DetailSection title="Organizer workspace">
        <div className="grid gap-3 sm:grid-cols-3">
          <Metric label="Lifecycle" value={titleCase(event.status)} />
          <Metric label="Going" value={String(event.goingCount)} />
          <Metric
            label="Needs action"
            value={String(pendingCount + paymentReviewCount)}
          />
        </div>
      </DetailSection>
      <div className="divide-y divide-border/70 border-y border-border/70">
        <ManageRow
          title="Setup checklist"
          status="Review missing event details"
          actionLabel="Open"
          onAction={() => onNavigate("setup")}
        />
        <LifecycleOverviewRow event={event} onSaved={onSaved} />
        <ManageRow
          title="Participants"
          status={`${pendingCount} requests, ${paymentReviewCount} payment reviews`}
          actionLabel="Review"
          onAction={() => onNavigate("participants")}
        />
        <ManageRow
          title="Modules"
          status="Enable or hide optional sections"
          actionLabel="Settings"
          onAction={() => onNavigate("settings")}
        />
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/70 px-2.5 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function LifecycleOverviewRow({
  event,
  onSaved,
}: {
  event: Event;
  onSaved: () => void;
}) {
  const updateEventMutation = useUpdateEvent();
  const [selectedStatus, setSelectedStatus] = useState<Event["status"]>(
    event.status,
  );
  useEffect(() => {
    setSelectedStatus(event.status);
  }, [event.status]);
  const changeStatus = (status: Event["status"], reason?: string) => {
    updateEventMutation.mutate(
      {
        eventId: event.id,
        data: {
          status,
          ...(status === "cancelled" ? { cancelReason: reason ?? "" } : {}),
        },
      },
      {
        onSuccess: () => {
          toast.success("Lifecycle updated.");
          onSaved();
        },
        onError: (error) =>
          toast.error(getApiErrorMessage(error, "Failed to update lifecycle")),
      },
    );
  };
  const statusOptions = getLifecycleStatusOptions(event.status);
  return (
    <div className="flex flex-col gap-3 py-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">Lifecycle</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {getLifecycleDescription(event.status)}
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Select
          value={selectedStatus}
          items={statusOptions}
          onValueChange={(value) =>
            setSelectedStatus((value ?? event.status) as Event["status"])
          }
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={
            updateEventMutation.isPending || selectedStatus === event.status
          }
          onClick={() => changeStatus(selectedStatus)}
        >
          {updateEventMutation.isPending ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}

function JoinFormManageSection({
  event,
  fields,
  isLoading,
  error,
}: {
  event: Event;
  fields: EventJoinFormField[];
  isLoading: boolean;
  error: unknown;
}) {
  const updateFieldsMutation = useUpdateEventJoinFormFields();
  const configured =
    fields.length > 0 ? fields : defaultJoinFormFields(event.id);
  const [draftFields, setDraftFields] = useState(configured);
  useEffect(() => {
    setDraftFields(configured);
  }, [configured]);
  const saveFields = () => {
    updateFieldsMutation.mutate(
      {
        eventId: event.id,
        data: {
          fields: draftFields.map((field) => ({
            fieldKey: field.fieldKey,
            label: field.label,
            fieldType: field.fieldType,
            required: field.required,
            options: field.options,
            sortOrder: field.sortOrder,
            enabled: field.enabled,
          })),
        },
      },
      {
        onSuccess: () => toast.success("Join form saved."),
        onError: (saveError) =>
          toast.error(
            getApiErrorMessage(saveError, "Failed to save join form"),
          ),
      },
    );
  };
  return (
    <Tabs defaultValue="fields" orientation="horizontal" className="gap-4">
      <TabsList variant="line" className={manageNestedTabsListClassName}>
        <TabsTrigger value="fields" className={manageNestedTabTriggerClassName}>
          Fields
        </TabsTrigger>
        <TabsTrigger
          value="preview"
          className={manageNestedTabTriggerClassName}
        >
          Preview
        </TabsTrigger>
        <TabsTrigger
          value="responses"
          className={manageNestedTabTriggerClassName}
        >
          Responses
        </TabsTrigger>
      </TabsList>
      <TabsContent value="fields" className="space-y-4">
        {isLoading ? (
          <Skeleton className="h-32 rounded-xl" />
        ) : error ? (
          <p className="text-sm text-destructive">
            {getApiErrorMessage(error, "Join form fields could not be loaded.")}
          </p>
        ) : (
          <div className="divide-y divide-border/70 border-y border-border/70">
            {draftFields.map((field, index) => (
              <ManageRow
                key={field.fieldKey}
                title={field.label}
                status={`${field.enabled ? "Enabled" : "Disabled"} · ${
                  field.required ? "Required" : "Optional"
                }`}
                actionLabel={field.enabled ? "Disable" : "Enable"}
                onAction={() =>
                  setDraftFields((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, enabled: !item.enabled }
                        : item,
                    ),
                  )
                }
              />
            ))}
          </div>
        )}
        <Button disabled={updateFieldsMutation.isPending} onClick={saveFields}>
          {updateFieldsMutation.isPending ? "Saving..." : "Save join form"}
        </Button>
      </TabsContent>
      <TabsContent value="preview" className="space-y-3">
        {draftFields
          .filter((field) => field.enabled)
          .map((field) => (
            <SetupField key={field.fieldKey} label={field.label}>
              {field.fieldType === "long_text" ? (
                <Textarea
                  disabled
                  placeholder={field.required ? "Required" : "Optional"}
                />
              ) : (
                <Input
                  disabled
                  placeholder={field.required ? "Required" : "Optional"}
                />
              )}
            </SetupField>
          ))}
      </TabsContent>
      <TabsContent value="responses">
        <p className="text-sm text-muted-foreground">
          Responses appear inside participant detail records and are only
          returned to organizers.
        </p>
      </TabsContent>
    </Tabs>
  );
}

function ModuleSettingsSection({
  event,
  isSaving,
  onSave,
}: {
  event: Event;
  isSaving: boolean;
  onSave: (modules: Event["modules"]) => void;
}) {
  const [modules, setModules] = useState<Event["modules"]>({
    payment: event.paymentEnabled,
    posts: event.postsEnabled,
    awards: event.awardsEnabled,
    sponsors: event.sponsorsEnabled,
    program: event.programEnabled,
    interested: event.interestedEnabled,
  });
  const toggle = (key: keyof Event["modules"], checked: boolean) =>
    setModules((current) => ({ ...current, [key]: checked }));
  return (
    <DetailSection title="Modules">
      <div className="divide-y divide-border/70 border-y border-border/70">
        {moduleSettingsOptions.map((option) => (
          <label
            key={option.key}
            className="flex cursor-pointer items-start gap-3 py-3 text-sm"
          >
            <input
              className="mt-1"
              type="checkbox"
              checked={modules[option.key]}
              onChange={(item) => toggle(option.key, item.target.checked)}
            />
            <span>
              <span className="font-medium text-foreground">
                {option.label}
              </span>
              <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                {option.helper}
              </span>
            </span>
          </label>
        ))}
      </div>
      <Button
        className="mt-4"
        disabled={isSaving}
        onClick={() => onSave(modules)}
      >
        {isSaving ? "Saving..." : "Save modules"}
      </Button>
    </DetailSection>
  );
}

function DuplicateEventSection({ event }: { event: Event }) {
  const duplicateMutation = useDuplicateEvent();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(`Copy of ${event.title}`);
  const [startsAt, setStartsAt] = useState(
    toDateTimeLocalValue(event.startsAt, event.timezone),
  );
  const [endsAt, setEndsAt] = useState(
    toDateTimeLocalValue(event.endsAt, event.timezone),
  );
  const [copyPaymentSetup, setCopyPaymentSetup] = useState(false);
  const [copyAwards, setCopyAwards] = useState(false);
  const [copySponsors, setCopySponsors] = useState(false);
  const [copyPosts, setCopyPosts] = useState(false);
  const [copyProgram, setCopyProgram] = useState(event.programEnabled);
  const [copySafetyLogistics, setCopySafetyLogistics] = useState(true);
  const submit = () => {
    const payload: DuplicateEventRequest = {
      title: title.trim(),
      startsAt: toISO(startsAt, event.timezone || EVENT_DETAIL_TIMEZONE),
      endsAt: toISO(endsAt, event.timezone || EVENT_DETAIL_TIMEZONE),
      copyPaymentSetup,
      copyAwards,
      copySponsors,
      copyPosts,
      copyProgram,
      copySafetyLogistics,
    };
    duplicateMutation.mutate(
      { eventId: event.id, data: payload },
      {
        onSuccess: (created) => {
          toast.success("Event duplicated as draft.");
          window.location.href = `/events/${encodeURIComponent(created.slug)}/manage`;
        },
        onError: (error) =>
          toast.error(getApiErrorMessage(error, "Failed to duplicate event")),
      },
    );
  };
  return (
    <DetailSection title="Duplicate event">
      <p className="text-sm text-muted-foreground">
        Create a draft copy without participants, payments, interests, or
        attendance.
      </p>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger render={<Button className="mt-4" variant="outline" />}>
          Duplicate event
        </DialogTrigger>
        <DialogContent className="max-w-2xl!">
          <DialogHeader>
            <DialogTitle>Duplicate event</DialogTitle>
            <DialogDescription>
              The copy starts as draft and keeps organizer-only access.
            </DialogDescription>
          </DialogHeader>
          <SetupField label="New event name">
            <Input
              value={title}
              onChange={(item) => setTitle(item.target.value)}
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
          {[
            [
              "copyPaymentSetup",
              "Copy payment setup",
              copyPaymentSetup,
              setCopyPaymentSetup,
            ],
            ["copyAwards", "Copy awards", copyAwards, setCopyAwards],
            ["copySponsors", "Copy sponsors", copySponsors, setCopySponsors],
            ["copyPosts", "Copy posts", copyPosts, setCopyPosts],
            ["copyProgram", "Copy program", copyProgram, setCopyProgram],
            [
              "copySafetyLogistics",
              "Copy safety/logistics",
              copySafetyLogistics,
              setCopySafetyLogistics,
            ],
          ].map(([key, label, checked, setter]) => (
            <label
              key={String(key)}
              className="flex items-center gap-2 text-sm"
            >
              <input
                type="checkbox"
                checked={Boolean(checked)}
                onChange={(item) =>
                  (setter as (value: boolean) => void)(item.target.checked)
                }
              />
              {String(label)}
            </label>
          ))}
          <DialogFooter showCloseButton>
            <Button disabled={duplicateMutation.isPending} onClick={submit}>
              {duplicateMutation.isPending ? "Duplicating..." : "Duplicate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DetailSection>
  );
}

const EVENT_DETAIL_TIMEZONE = DEFAULT_TIMEZONE;

const eventUpdateTypeOptions: Array<{ value: EventPostType; label: string }> = [
  { value: "announcement", label: "Announcement" },
  { value: "schedule", label: "Schedule update" },
  { value: "logistics", label: "Logistics" },
  { value: "payment", label: "Payment reminder" },
  { value: "competition", label: "Competition" },
  { value: "results", label: "Results" },
  { value: "general", label: "General" },
];

const moduleSettingsOptions: Array<{
  key: keyof Event["modules"];
  label: string;
  helper: string;
}> = [
  {
    key: "payment",
    label: "Payment",
    helper: "Show payment setup and participant proof workflows.",
  },
  {
    key: "posts",
    label: "Posts",
    helper: "Show official event updates and announcements.",
  },
  {
    key: "awards",
    label: "Awards",
    helper: "Show competitions, prizes, and results.",
  },
  {
    key: "sponsors",
    label: "Sponsors",
    helper: "Show sponsor blocks on the event page.",
  },
  {
    key: "program",
    label: "Program",
    helper: "Show the event flow, activities, and schedule.",
  },
  {
    key: "interested",
    label: "Interested",
    helper: "Let people mark interest before joining.",
  },
];

function defaultJoinFormFields(eventId: string): EventJoinFormField[] {
  return [
    ["emergencyContactName", "Emergency contact name", "short_text", false],
    ["emergencyContactPhone", "Emergency contact phone", "phone", false],
    [
      "certificationLevel",
      "Freediving certification or level",
      "short_text",
      false,
    ],
    ["experienceNote", "Experience note", "long_text", false],
    ["equipmentNeeded", "Equipment needed", "long_text", false],
    ["organizerNote", "Note to organizer", "long_text", false],
  ].map(([fieldKey, label, fieldType, required], index) => ({
    id: `${eventId}-${fieldKey}`,
    eventId,
    fieldKey: String(fieldKey),
    label: String(label),
    fieldType: fieldType as EventJoinFormField["fieldType"],
    required: Boolean(required),
    options: [],
    sortOrder: index,
    enabled: fieldKey === "organizerNote",
    createdAt: "",
    updatedAt: "",
  }));
}

function getLifecycleDescription(status: Event["status"]) {
  switch (status) {
    case "draft":
      return "Draft, hidden from public discovery, and not joinable.";
    case "published":
      return "Published, discoverable under visibility rules, and joinable.";
    case "full":
      return "Full, discoverable but not joinable.";
    case "cancelled":
      return "Cancelled, visible only where product rules allow, and not joinable.";
    case "completed":
      return "Completed, archived for review and attendance records.";
    case "archived":
      return "Archived and hidden from normal discovery.";
  }
}

const lifecycleStatusLabels: Record<Event["status"], string> = {
  draft: "Draft",
  published: "Published",
  full: "Full",
  cancelled: "Cancelled",
  completed: "Completed",
  archived: "Archived",
};

const lifecycleNextStatuses: Record<Event["status"], Event["status"][]> = {
  draft: ["published", "cancelled", "archived"],
  published: ["draft", "full", "cancelled", "completed", "archived"],
  full: ["published", "cancelled", "completed", "archived"],
  cancelled: ["draft", "archived"],
  completed: ["archived"],
  archived: ["draft"],
};

function getLifecycleStatusOptions(status: Event["status"]) {
  const values = [status, ...lifecycleNextStatuses[status]];
  return values.map((value) => ({
    value,
    label: lifecycleStatusLabels[value],
  }));
}

const prizePlacementOptions: Array<{
  value: EventPrizePlacement;
  label: string;
}> = [
  { value: "winner", label: "Winner" },
  { value: "champion", label: "Champion" },
  { value: "first_place", label: "1st place" },
  { value: "second_place", label: "2nd place" },
  { value: "third_place", label: "3rd place" },
  { value: "special_award", label: "Special award" },
  { value: "sponsor_award", label: "Sponsor award" },
  { value: "custom", label: "Custom" },
];

const prizeTypeOptions: Array<{ value: EventPrizeType; label: string }> = [
  { value: "cash", label: "Cash" },
  { value: "item", label: "Item" },
  { value: "certificate", label: "Certificate" },
  { value: "sponsor_gift", label: "Sponsor gift" },
  { value: "other", label: "Other" },
];

const sponsorTierOptions: Array<{ value: EventSponsorTier; label: string }> = [
  { value: "presenting", label: "Presenting" },
  { value: "major", label: "Major" },
  { value: "minor", label: "Minor" },
  { value: "partner", label: "Partner" },
  { value: "community", label: "Community" },
  { value: "media", label: "Media" },
  { value: "other", label: "Other" },
];

function OrganizerManageTab({
  event,
  onSaved,
  mode = "setup",
  onNavigate,
}: {
  event: Event;
  onSaved: () => void;
  mode?: "setup" | "payments";
  onNavigate?: (tab: EventManageTab) => void;
}) {
  const updateEventMutation = useUpdateEvent();
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
  const [postsEnabled, setPostsEnabled] = useState(event.postsEnabled);

  const activePaymentMethods = (event.paymentMethods ?? []).filter(
    (method) => method.isActive,
  );
  const isSaving = updateEventMutation.isPending;

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
    const startsAtIso = toISO(
      startsAt,
      event.timezone || EVENT_DETAIL_TIMEZONE,
    );
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

  const savePostSettings = () => {
    savePatch(
      {
        postsEnabled,
        postCreatePolicy: "organizers_only",
      },
      "Update settings saved.",
    );
  };

  const archiveEvent = () => {
    updateEventMutation.mutate(
      { eventId: event.id, data: { status: "archived" } },
      {
        onSuccess: () => {
          toast.success("Event archived.");
          onSaved();
        },
        onError: (error) => {
          toast.error(getApiErrorMessage(error, "Failed to archive event"));
        },
      },
    );
  };

  const showSetupRows = mode === "setup";
  const showPaymentRows = mode === "payments";

  return (
    <div className="space-y-4">
      <DetailSection title={showPaymentRows ? "Payment setup" : "Setup"}>
        <p className="text-sm leading-6 text-muted-foreground">
          {showPaymentRows
            ? "Manage participant payment instructions, amount, and manual payment methods."
            : "Add participant-facing details. Each setup area opens in a focused dialog."}
        </p>
      </DetailSection>

      <div className="divide-y divide-border/70 border-y border-border/70">
        {showSetupRows ? (
          <>
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
              actionLabel="Open"
              onAction={() => onNavigate?.("payment")}
            />
            <ManageRow
              title="Event updates"
              status={event.postsEnabled ? "Enabled" : "Disabled"}
              actionLabel="Open"
              onAction={() => onNavigate?.("updates")}
            />
          </>
        ) : null}
        {showPaymentRows ? (
          <ManageRow
            title="Payment setup"
            status={getPaymentSetupStatus(event, activePaymentMethods.length)}
            actionLabel="Manage"
            href={`/events/${encodeURIComponent(event.slug)}/manage/payments`}
          />
        ) : null}
      </div>

      {showSetupRows ? (
        <DetailSection title="Danger zone">
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  Archive event
                </p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Hide this event from public event lists without permanently
                  deleting its setup, participants, updates, or records.
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger
                  render={
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={
                        event.status === "archived" ||
                        updateEventMutation.isPending
                      }
                    />
                  }
                >
                  {event.status === "archived" ? "Archived" : "Archive event"}
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Archive this event?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This hides the event from public event lists. It does not
                      hard delete the event or its records.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={archiveEvent}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Archive event
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </DetailSection>
      ) : null}

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
            <MarkdownEditor
              value={descriptionMarkdown}
              onChange={setDescriptionMarkdown}
              placeholder="Schedule, inclusions, what to bring, and organizer notes"
              maxLength={20000}
              minRows={8}
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
                items={[
                  { value: "public", label: "Public" },
                  { value: "private", label: "Private" },
                ]}
                onValueChange={(value) =>
                  setVisibility(value as EventVisibility)
                }
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
                  Organizer approval is needed before a participant is
                  confirmed.
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
                items={difficultyOptions}
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
                items={[
                  { value: "none", label: "Not set" },
                  ...entryTypeOptions,
                ]}
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
        open={activeEditor === "posts"}
        onOpenChange={(open) => setActiveEditor(open ? "posts" : null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Updates</DialogTitle>
            <DialogDescription>
              Control whether the official event Updates feed is visible.
            </DialogDescription>
          </DialogHeader>
          <label className="flex items-start gap-2 rounded-lg border border-border/70 p-3 text-sm">
            <input
              className="mt-1"
              type="checkbox"
              checked={postsEnabled}
              onChange={(item) => setPostsEnabled(item.target.checked)}
            />
            <span>
              <span className="block font-medium text-foreground">
                Updates enabled
              </span>
              <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                Show official event announcements, reminders, and results to
                event viewers.
              </span>
            </span>
          </label>
          <DialogFooter showCloseButton>
            <Button disabled={isSaving} onClick={savePostSettings}>
              {isSaving ? "Saving..." : "Save"}
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
  disabled = false,
  note,
  href,
  onAction,
}: {
  title: string;
  status: string;
  actionLabel: string;
  disabled?: boolean;
  note?: string;
  href?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{status}</p>
        {note ? (
          <p className="mt-1 text-xs text-muted-foreground">{note}</p>
        ) : null}
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={disabled}
        onClick={onAction}
        nativeButton={href ? false : undefined}
        render={href ? <Link href={href} /> : undefined}
      >
        {actionLabel}
      </Button>
    </div>
  );
}

function parseOptionalPrice(value: string): number | undefined | "invalid" {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number.parseFloat(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return "invalid";
  return parsed;
}

function SetupField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
    </div>
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
      return "Not required";
    case "pending_upload":
      return "Pending payment";
    case "submitted":
      return "Submitted";
    case "verified":
      return "Verified";
    case "rejected":
      return "Rejected";
    default:
      return titleCase(status);
  }
}

function getEventTypeBadgeClass() {
  return "h-6 border-sky-500/30 bg-sky-500/10 px-2 text-[11px] text-sky-700";
}

function getEventDifficultyBadgeClass(difficulty: Event["difficulty"]) {
  const base = "h-6 px-2 text-[11px]";
  switch (difficulty) {
    case "beginner":
      return `${base} border-emerald-500/30 bg-emerald-500/10 text-emerald-700`;
    case "intermediate":
      return `${base} border-amber-500/30 bg-amber-500/10 text-amber-700`;
    case "advanced":
    case "expert":
      return `${base} border-destructive/30 bg-destructive/10 text-destructive`;
    default:
      return `${base} border-muted-foreground/25 bg-muted text-muted-foreground`;
  }
}

function getEventVisibilityBadgeClass(visibility: Event["visibility"]) {
  const base = "h-6 px-2 text-[11px]";
  if (visibility === "private") {
    return `${base} border-violet-500/30 bg-violet-500/10 text-violet-700`;
  }
  return `${base} border-emerald-500/30 bg-emerald-500/10 text-emerald-700`;
}

function getEventAccessBadgeClass(requiresApproval: boolean) {
  const base = "h-6 px-2 text-[11px]";
  if (requiresApproval) {
    return `${base} border-amber-500/30 bg-amber-500/10 text-amber-700`;
  }
  return `${base} border-emerald-500/30 bg-emerald-500/10 text-emerald-700`;
}

function getEventPriceBadgeClass(event: Event) {
  const base = "h-6 px-2 text-[11px]";
  if (!acceptsEventPayments(event)) {
    return `${base} border-emerald-500/30 bg-emerald-500/10 text-emerald-700`;
  }
  if (getEventPaymentMode(event) === "optional") {
    return `${base} border-sky-500/30 bg-sky-500/10 text-sky-700`;
  }
  return `${base} border-amber-500/30 bg-amber-500/10 text-amber-700`;
}

function getParticipantStatusBadgeClass(status: EventParticipant["status"]) {
  const base = "h-5 px-2 text-[11px]";
  switch (status) {
    case "confirmed":
      return `${base} border-emerald-500/30 bg-emerald-500/10 text-emerald-700`;
    case "pending_approval":
      return `${base} border-amber-500/30 bg-amber-500/10 text-amber-700`;
    case "rejected":
    case "cancelled":
      return `${base} border-destructive/30 bg-destructive/10 text-destructive`;
    case "left":
      return `${base} border-muted-foreground/25 bg-muted text-muted-foreground`;
    default:
      return base;
  }
}

function getParticipantRoleBadgeClass(role: EventParticipant["role"]) {
  const base = "h-5 px-2 text-[11px]";
  if (role === "organizer") {
    return `${base} border-sky-500/30 bg-sky-500/10 text-sky-700`;
  }
  return `${base} border-violet-500/30 bg-violet-500/10 text-violet-700`;
}

function getPaymentStatusBadgeClass(status: EventPaymentStatus) {
  const base = "h-5 px-2 text-[11px]";
  switch (status) {
    case "verified":
      return `${base} border-emerald-500/30 bg-emerald-500/10 text-emerald-700`;
    case "submitted":
      return `${base} border-sky-500/30 bg-sky-500/10 text-sky-700`;
    case "pending_upload":
      return `${base} border-amber-500/30 bg-amber-500/10 text-amber-700`;
    case "rejected":
      return `${base} border-destructive/30 bg-destructive/10 text-destructive`;
    case "not_required":
      return `${base} border-muted-foreground/25 bg-muted text-muted-foreground`;
    default:
      return base;
  }
}

function getPassPaymentStatus(pass: EventPass): EventPaymentStatus {
  return (
    pass.payment?.status ??
    pass.participant.payment?.status ??
    (requiresEventPayment(pass.event) ? "pending_upload" : "not_required")
  );
}

function getPaymentMethodLabel(method: EventPaymentMethod) {
  const name = method.name?.trim();
  if (name) return name;
  if (method.type === "bank_transfer") return "Bank transfer";
  if (method.type === "manual_qr") return "Manual QR";
  return "Payment method";
}

function getCompetitionHref(event: Event, competition: EventCompetition) {
  return `/events/${encodeURIComponent(event.slug)}/competitions-and-prizes/${encodeURIComponent(getCompetitionUrlSlug(competition))}`;
}

function getCompetitionUrlSlug(competition: EventCompetition) {
  const nameSlug =
    competition.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "competition";
  return `${nameSlug}-${competition.id.slice(0, 8)}`;
}

function prizePlacementLabel(prize: EventPrize) {
  if (prize.placementLabel) return prize.placementLabel;
  return (
    prizePlacementOptions.find((option) => option.value === prize.placement)
      ?.label ?? titleCase(prize.placement)
  );
}

function eventUpdateTypeLabel(type?: EventPostType) {
  return (
    eventUpdateTypeOptions.find((option) => option.value === type)?.label ??
    "General"
  );
}

function sponsorTierLabel(tier: EventSponsorTier | "none") {
  if (tier === "none") return "Sponsors";
  return (
    sponsorTierOptions.find((option) => option.value === tier)?.label ??
    titleCase(tier)
  );
}

function groupSponsorsByTier(sponsors: EventSponsor[]) {
  const groups = new Map<EventSponsorTier | "none", EventSponsor[]>();
  for (const sponsor of sponsors) {
    const key = sponsor.tier ?? "none";
    groups.set(key, [...(groups.get(key) ?? []), sponsor]);
  }
  const order = sponsorTierOptions.map((option) => option.value);
  return Array.from(groups.entries()).sort(([a], [b]) => {
    if (a === "none") return 1;
    if (b === "none") return -1;
    return order.indexOf(a) - order.indexOf(b);
  });
}

function safeExternalUrl(value?: string) {
  if (!value) return "";
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "";
    }
    return parsed.toString();
  } catch {
    return "";
  }
}

function formatEventPriceLabel(event: Event) {
  const mode = getEventPaymentMode(event);
  if (mode === "free") return "Free";
  if (event.priceAmount == null) {
    return mode === "optional" ? "Donation optional" : "Fee required";
  }
  if (mode === "optional") {
    return `Donation ${formatPeso(event.priceAmount)}`;
  }
  return formatPeso(event.priceAmount);
}

function getPaymentSetupStatus(event: Event, activePaymentMethodCount: number) {
  const mode = getEventPaymentMode(event);
  if (mode === "free") return "Free event";
  if (activePaymentMethodCount === 0) return "Incomplete";
  if (mode === "optional" && event.priceAmount == null) {
    return "Donations enabled";
  }
  if (event.priceAmount == null) return "Fee enabled";
  return "Ready";
}

function getEventPaymentMode(event: Event): EventPaymentMode {
  return event.paymentMode ?? (event.isPaid ? "required" : "free");
}

function acceptsEventPayments(event: Event) {
  return getEventPaymentMode(event) !== "free";
}

function requiresEventPayment(event: Event) {
  return getEventPaymentMode(event) === "required";
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

function getEventPassUrl(event: Event, participant?: EventParticipant | null) {
  const token = participant?.qrToken?.trim();
  if (!token) return "";
  const origin =
    typeof window === "undefined"
      ? process.env.NEXT_PUBLIC_APP_URL?.trim() ||
        process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
        siteConfig.url
      : window.location.origin;
  return `${origin.replace(/\/$/, "")}/events/${encodeURIComponent(event.slug)}/pass/${encodeURIComponent(token)}`;
}

function canShowEventPass(
  participant?: EventParticipant | null,
): participant is EventParticipant {
  if (!participant?.qrToken) return false;
  return ["pending_approval", "confirmed", "attended"].includes(
    participant.status,
  );
}

function formatDateTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function programItemToForm(
  item: EventProgramItem | null,
  event: Event,
): CreateEventProgramItemRequest {
  return {
    title: item?.title ?? "",
    descriptionMarkdown: item?.descriptionMarkdown ?? "",
    programDate: item?.programDate ?? "",
    startTime: item?.startTime ?? "",
    endTime: item?.endTime ?? "",
    locationLabel: item?.locationLabel ?? "",
    competitionId: item?.competitionId ?? "",
    isHighlighted: item?.isHighlighted ?? false,
  };
}

function groupProgramItems(items: EventProgramItem[]) {
  const sorted = [...items].sort(compareProgramItems);
  const groups: Array<{ label: string; items: EventProgramItem[] }> = [];
  for (const item of sorted) {
    const label = item.programDate
      ? formatProgramDate(item.programDate, item.timezone)
      : "Activities";
    const current = groups.find((group) => group.label === label);
    if (current) {
      current.items.push(item);
    } else {
      groups.push({ label, items: [item] });
    }
  }
  return groups;
}

function compareProgramItems(a: EventProgramItem, b: EventProgramItem) {
  return (
    compareString(a.programDate, b.programDate) ||
    compareString(a.startTime, b.startTime) ||
    a.sortOrder - b.sortOrder ||
    compareString(a.createdAt, b.createdAt)
  );
}

function compareProgramManageItems(a: EventProgramItem, b: EventProgramItem) {
  return (
    a.sortOrder - b.sortOrder ||
    compareString(a.programDate, b.programDate) ||
    compareString(a.startTime, b.startTime) ||
    compareString(a.createdAt, b.createdAt)
  );
}

function compareString(a?: string, b?: string) {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a.localeCompare(b);
}

function formatProgramDate(value: string, timezone?: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeZone: timezone || EVENT_DETAIL_TIMEZONE,
  }).format(date);
}

function formatProgramTime(item: EventProgramItem) {
  if (!item.startTime) return "";
  const start = formatClockTime(item.startTime);
  if (!item.endTime) return start;
  return `${start} - ${formatClockTime(item.endTime)}`;
}

function formatClockTime(value: string) {
  const [hourValue, minuteValue] = value.split(":");
  const hour = Number(hourValue);
  const minute = Number(minuteValue);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return value;
  const date = new Date(2020, 0, 1, hour, minute);
  return new Intl.DateTimeFormat("en-PH", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
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
    timeZone: timezone || EVENT_DETAIL_TIMEZONE,
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

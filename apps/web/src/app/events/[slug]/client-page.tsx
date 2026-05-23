"use client";

import { SignInButton } from "@clerk/nextjs";
import type {
  Event,
  EventCompetition,
  EventDifficulty,
  EventEntryType,
  EventParticipant,
  EventPaymentMethod,
  EventPaymentMethodType,
  EventPaymentStatus,
  EventPost,
  EventPostCreatePolicy,
  EventPrize,
  EventPrizePlacement,
  EventPrizeType,
  EventSponsor,
  EventSponsorTier,
  EventVisibility,
  CreateEventPrizeRequest,
  CreateEventSponsorRequest,
  UpdateEventRequest,
  UpdateEventPrizeRequest,
  UpdateEventSponsorRequest,
} from "@freediving.ph/types";
import {
  ArrowLeft,
  Award,
  CalendarClock,
  CheckCircle2,
  Handshake,
  Lock,
  MapPin,
  MessageSquare,
  Pencil,
  Pin,
  Plus,
  ShieldCheck,
  Ticket,
  Trash2,
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
import { MarkdownEditor } from "@/features/chika/components/MarkdownEditor";
import { DiveSiteCombobox } from "@/features/diveSpots/components/DiveSiteCombobox";
import {
  difficultyOptions,
  entryTypeOptions,
  eventOptionLabel,
  titleCase,
  useApproveEventParticipant,
  useCreateEventCompetition,
  useCreateEventPaymentMethod,
  useCreateEventPost,
  useCreateEventPrize,
  useCreateEventSponsor,
  useDeleteEventCompetition,
  useDeleteEventPost,
  useDeleteEventPrize,
  useDeleteEventSponsor,
  useEvent,
  useEventCompetitions,
  useEventParticipants,
  useEventPaymentProofUrl,
  useEventPosts,
  useEventPrizes,
  useEventSponsors,
  useJoinEvent,
  useLeaveEvent,
  useMarkEventInterested,
  useMarkEventUninterested,
  useRejectEventParticipant,
  useRejectEventPayment,
  useSubmitEventPayment,
  useUpdateEventCompetition,
  useUpdateEvent,
  useUpdateEventParticipantRole,
  useUpdateEventPost,
  useUpdateEventPostSettings,
  useUpdateEventPrize,
  useUpdateEventSponsor,
  useVerifyEventPayment,
} from "@/features/events";
import { mediaApi } from "@/features/media/api/media";
import { getApiErrorMessage, getApiErrorStatus } from "@/lib/http/api-error";

type EventTab =
  | "updates"
  | "overview"
  | "participants"
  | "prizes"
  | "sponsors"
  | "payment";

const eventTabsListClassName =
  "no-scrollbar -mx-3 w-[calc(100%+1.5rem)] justify-start overflow-x-auto rounded-none border-b border-border/70 bg-transparent px-3 sm:mx-0 sm:w-full sm:px-0";
const eventTabTriggerClassName =
  "h-10 flex-none rounded-none px-3 text-sm data-active:bg-transparent data-active:shadow-none";

export default function EventDetailClient({ slug }: { slug: string }) {
  const session = useSession();
  const isSignedIn = session.status === "signed_in";
  const [activeTab, setActiveTab] = useState<EventTab>("updates");
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
    (event?.viewerCanManage ||
      event?.viewerParticipation?.status === "confirmed");
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
  const selectedPaymentMethod =
    paymentMethods.find((method) => method.id === selectedPaymentMethodId) ??
    paymentMethods[0];
  const canShowJoinPanel =
    !event.viewerCanManage &&
    (isSignedIn || event.viewerEventState !== "anonymous");
  const canShowParticipantsTab =
    event.visibility === "public" ||
    event.viewerCanViewPrivateDetails ||
    event.viewerCanManage;
  const canShowPrizeSponsorTabs = canSeePrivateDetails || event.viewerCanManage;
  const canShowUpdatesTab =
    event.viewerCanManage || event.viewerParticipation?.status === "confirmed";
  const canShowPaymentTab =
    canSeePrivateDetails &&
    (!event.isPaid || event.viewerJoined || event.viewerCanManage);
  const visibleTabs: EventTab[] = [
    ...(canShowUpdatesTab ? (["updates"] as const) : []),
    "overview",
    ...(canShowParticipantsTab ? (["participants"] as const) : []),
    ...(canShowPrizeSponsorTabs ? (["prizes"] as const) : []),
    ...(canShowPrizeSponsorTabs ? (["sponsors"] as const) : []),
    ...(canShowPaymentTab ? (["payment"] as const) : []),
  ];
  const currentTab = visibleTabs.includes(activeTab)
    ? activeTab
    : (visibleTabs[0] ?? "overview");

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
        canShowJoinPanel={canShowJoinPanel}
        canShowPaymentTab={canShowPaymentTab}
        isSignedIn={isSignedIn}
        onSelectTab={setActiveTab}
        onJoinAction={() =>
          document
            .getElementById("event-join-actions")
            ?.scrollIntoView({ behavior: "smooth", block: "start" })
        }
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
          {canShowParticipantsTab ? (
            <TabsTrigger
              value="participants"
              className={eventTabTriggerClassName}
              onClick={() => setActiveTab("participants")}
            >
              Participants
            </TabsTrigger>
          ) : null}
          {canShowPrizeSponsorTabs ? (
            <TabsTrigger
              value="prizes"
              className={eventTabTriggerClassName}
              onClick={() => setActiveTab("prizes")}
            >
              Prizes
            </TabsTrigger>
          ) : null}
          {canShowPrizeSponsorTabs ? (
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
              viewerUserId={session.me?.userId}
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

        {canShowPrizeSponsorTabs ? (
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

        {canShowPrizeSponsorTabs ? (
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
              onManagePaymentHref={`/events/${encodeURIComponent(event.slug)}/manage#setup`}
            />
          </TabsContent>
        ) : null}
      </Tabs>
    </CommunityPageShell>
  );
}

export function EventManageClient({ slug }: { slug: string }) {
  const session = useSession();
  const eventQuery = useEvent(slug);
  const event = eventQuery.data;
  const eventId = event?.id ?? "";
  const canManage = Boolean(eventId) && Boolean(event?.viewerCanManage);
  const participantsQuery = useEventParticipants(eventId, canManage);
  const competitionsQuery = useEventCompetitions(eventId, canManage);
  const prizesQuery = useEventPrizes(eventId, canManage);
  const sponsorsQuery = useEventSponsors(eventId, canManage);
  const postsQuery = useEventPosts(
    eventId,
    canManage && Boolean(event?.postsEnabled),
  );
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
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="h-6 px-2 text-[11px]">
            {event.status}
          </Badge>
          <Badge variant="outline" className="h-6 px-2 text-[11px]">
            {event.visibility === "private" ? "Private" : "Public"}
          </Badge>
          <Badge variant="outline" className="h-6 px-2 text-[11px]">
            {event.isPaid ? "Paid" : "Free"}
          </Badge>
        </div>
      </CommunityHeader>

      <div className="space-y-8">
        <section id="setup" className="scroll-mt-4">
          <OrganizerManageTab
            event={event}
            onSaved={() => {
              void eventQuery.refetch();
            }}
          />
        </section>

        <section id="participants" className="scroll-mt-4">
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
                      getApiErrorMessage(error, "Failed to approve participant"),
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
            showOrganizerActions
          />
        </section>

        <section id="updates" className="scroll-mt-4">
          <PostsTab
            event={event}
            posts={postsQuery.data ?? []}
            isLoading={postsQuery.isLoading}
            error={postsQuery.error}
            viewerUserId={session.me?.userId}
            mode="manage"
          />
        </section>

        <section id="prizes" className="scroll-mt-4">
          <PrizesTab
            event={event}
            competitions={competitionsQuery.data ?? []}
            prizes={prizesQuery.data ?? []}
            isLoading={competitionsQuery.isLoading || prizesQuery.isLoading}
            error={competitionsQuery.error || prizesQuery.error}
          />
        </section>

        <section id="sponsors" className="scroll-mt-4">
          <SponsorsTab
            event={event}
            sponsors={sponsorsQuery.data ?? []}
            isLoading={sponsorsQuery.isLoading}
            error={sponsorsQuery.error}
          />
        </section>
      </div>
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

function EventHeader({
  event,
  canSeePrivateDetails,
  canShowJoinPanel,
  canShowPaymentTab,
  isSignedIn,
  onSelectTab,
  onJoinAction,
}: {
  event: Event;
  canSeePrivateDetails: boolean;
  canShowJoinPanel: boolean;
  canShowPaymentTab: boolean;
  isSignedIn: boolean;
  onSelectTab: (tab: EventTab) => void;
  onJoinAction: () => void;
}) {
  const privateLocked = event.visibility === "private" && !canSeePrivateDetails;
  const subtitle =
    event.shortDescription ||
    (canSeePrivateDetails
      ? "Details from the organizer are below."
      : "This is a private event. Details are limited until you are approved.");
  const chips = privateLocked
    ? [
        "Private event",
        event.requiresApproval ? "Approval required" : "",
      ].filter(Boolean)
    : [
        event.type ? eventOptionLabel(event.type) : "",
        event.difficulty ? titleCase(event.difficulty) : "",
        event.visibility === "private" ? "Private" : "Public",
        formatEventPriceLabel(event),
      ].filter(Boolean);

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
}: {
  event: Event;
  canShowJoinPanel: boolean;
  canShowPaymentTab: boolean;
  isSignedIn: boolean;
  onSelectTab: (tab: EventTab) => void;
  onJoinAction: () => void;
}) {
  if (event.viewerCanManage) {
    return (
      <Button
        size="sm"
        nativeButton={false}
        render={<Link href={`/events/${encodeURIComponent(event.slug)}/manage`} />}
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

  if (canShowJoinPanel) {
    return (
      <Button size="sm" onClick={onJoinAction}>
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
  const canUseInterest =
    event.visibility !== "private" ||
    event.viewerCanViewPrivateDetails ||
    event.viewerCanManage;
  const canToggleInterest =
    isSignedIn &&
    canUseInterest &&
    event.status === "published" &&
    ["none", "interested", "rejected", "left", "cancelled"].includes(
      viewerState,
    );
  const canJoin = !event.viewerParticipation;
  const stateLabel = getViewerStateLabel(viewerState) ?? "Not joined";
  const paymentStatus = getPaymentStatusLabel(
    event.viewerPayment?.status ??
      (event.isPaid ? "pending_upload" : "not_required"),
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
  const [prizeTitle, setPrizeTitle] = useState("");
  const [prizeCompetitionId, setPrizeCompetitionId] = useState("general");
  const [prizePlacement, setPrizePlacement] =
    useState<EventPrizePlacement>("custom");
  const [prizePlacementLabel, setPrizePlacementLabel] = useState("");
  const [prizeType, setPrizeType] = useState<EventPrizeType | "">("");
  const [prizeAmount, setPrizeAmount] = useState("");
  const [prizeCurrency, setPrizeCurrency] = useState("PHP");
  const [prizeDescription, setPrizeDescription] = useState("");

  const openCompetitionDialog = (competition?: EventCompetition) => {
    setEditingCompetition(competition ?? null);
    setCompetitionName(competition?.name ?? "");
    setCompetitionDescription(competition?.descriptionMarkdown ?? "");
    setCompetitionRules(competition?.rulesMarkdown ?? "");
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
    setPrizeCurrency(prize?.currency || "PHP");
    setPrizeDescription(prize?.descriptionMarkdown ?? "");
    setPrizeDialogOpen(true);
  };
  const saveCompetition = () => {
    const name = competitionName.trim();
    if (!name) {
      toast.error("Competition name is required.");
      return;
    }
    const data = {
      name,
      descriptionMarkdown: competitionDescription.trim() || undefined,
      rulesMarkdown: competitionRules.trim() || undefined,
    };
    const options = {
      onSuccess: () => {
        toast.success("Competition saved.");
        setCompetitionDialogOpen(false);
      },
      onError: (item: unknown) =>
        toast.error(getApiErrorMessage(item, "Failed to save competition")),
    };
    if (editingCompetition) {
      updateCompetitionMutation.mutate(
        { eventId: event.id, competitionId: editingCompetition.id, data },
        options,
      );
      return;
    }
    createCompetitionMutation.mutate({ eventId: event.id, data }, options);
  };
  const savePrize = () => {
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
    const createData: CreateEventPrizeRequest = {
      title,
      competitionId:
        prizeCompetitionId === "general" ? undefined : prizeCompetitionId,
      placement: prizePlacement,
      placementLabel: prizePlacementLabel.trim() || undefined,
      prizeType: prizeType || undefined,
      amount,
      currency: prizeCurrency.trim().toUpperCase() || "PHP",
      descriptionMarkdown: prizeDescription.trim() || undefined,
    };
    const options = {
      onSuccess: () => {
        toast.success("Prize saved.");
        setPrizeDialogOpen(false);
      },
      onError: (item: unknown) =>
        toast.error(getApiErrorMessage(item, "Failed to save prize")),
    };
    if (editingPrize) {
      const updateData: UpdateEventPrizeRequest = {
        ...createData,
        competitionId:
          prizeCompetitionId === "general" ? "" : prizeCompetitionId,
        placementLabel: prizePlacementLabel.trim() || "",
        prizeType: prizeType || "",
        descriptionMarkdown: prizeDescription.trim() || "",
      };
      updatePrizeMutation.mutate(
        { eventId: event.id, prizeId: editingPrize.id, data: updateData },
        options,
      );
      return;
    }
    createPrizeMutation.mutate(
      { eventId: event.id, data: createData },
      options,
    );
  };

  const generalPrizes = prizes.filter((prize) => !prize.competitionId);
  const prizesByCompetition = new Map<string, EventPrize[]>();
  for (const prize of prizes) {
    if (!prize.competitionId) continue;
    const items = prizesByCompetition.get(prize.competitionId) ?? [];
    items.push(prize);
    prizesByCompetition.set(prize.competitionId, items);
  }

  if (isLoading) {
    return <Skeleton className="h-32 rounded-xl" />;
  }
  if (error) {
    return (
      <p className="text-sm text-destructive">
        {getApiErrorMessage(error, "Prizes could not be loaded.")}
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <DetailSection title="Prizes and competitions">
        {event.viewerCanManage && readOnly ? (
          <Button
            size="sm"
            variant="outline"
            nativeButton={false}
            render={
              <Link href={`/events/${encodeURIComponent(event.slug)}/manage#prizes`} />
            }
          >
            Manage prizes
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

      {competitions.length === 0 && prizes.length === 0 ? (
        <CommunityEmptyState
          title="No prizes have been added yet."
          description={
            event.viewerCanManage
              ? "Add prizes or competition awards for this event."
              : "No prizes have been added yet."
          }
        />
      ) : (
        <div className="space-y-6">
          {competitions.map((competition) => (
            <DetailSection key={competition.id} title={competition.name}>
              {competition.descriptionMarkdown ? (
                <ChikaMarkdown content={competition.descriptionMarkdown} />
              ) : null}
              {competition.rulesMarkdown ? (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-foreground">Rules</h3>
                  <ChikaMarkdown content={competition.rulesMarkdown} />
                </div>
              ) : null}
              {event.viewerCanManage && !readOnly ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openCompetitionDialog(competition)}
                >
                  Edit competition
                </Button>
              ) : null}
              <PrizeList
                event={event}
                prizes={prizesByCompetition.get(competition.id) ?? []}
                onEdit={openPrizeDialog}
                readOnly={readOnly}
              />
            </DetailSection>
          ))}
          {generalPrizes.length > 0 ? (
            <DetailSection title="Event prizes">
              <PrizeList
                event={event}
                prizes={generalPrizes}
                onEdit={openPrizeDialog}
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
                disabled={deleteCompetitionMutation.isPending}
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
                createCompetitionMutation.isPending ||
                updateCompetitionMutation.isPending
              }
              onClick={saveCompetition}
            >
              Save
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
          <div className="grid gap-3 sm:grid-cols-3">
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
            <SetupField label="Currency">
              <Input
                value={prizeCurrency}
                onChange={(item) => setPrizeCurrency(item.target.value)}
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
                disabled={deletePrizeMutation.isPending}
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
                createPrizeMutation.isPending || updatePrizeMutation.isPending
              }
              onClick={savePrize}
            >
              Save
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
  onEdit: (prize: EventPrize) => void;
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
                    {prize.currency} {prize.amount}
                  </Badge>
                ) : null}
              </div>
              <h3 className="text-sm font-medium text-foreground">
                {prize.title}
              </h3>
            </div>
            {event.viewerCanManage && !readOnly ? (
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
              <Link href={`/events/${encodeURIComponent(event.slug)}/manage#sponsors`} />
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
              items={[{ value: "none", label: "Not set" }, ...sponsorTierOptions]}
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

function PostsTab({
  event,
  posts,
  isLoading,
  error,
  viewerUserId,
  mode = "manage",
}: {
  event: Event;
  posts: EventPost[];
  isLoading: boolean;
  error: unknown;
  viewerUserId?: string;
  mode?: "public" | "manage";
}) {
  const createPostMutation = useCreateEventPost();
  const updatePostMutation = useUpdateEventPost();
  const deletePostMutation = useDeleteEventPost();
  const updateSettingsMutation = useUpdateEventPostSettings();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<EventPost | null>(null);
  const [title, setTitle] = useState("");
  const [bodyMarkdown, setBodyMarkdown] = useState("");
  const isManageMode = mode === "manage";
  const canCreatePost =
    event.postsEnabled &&
    (isManageMode
      ? event.viewerCanManage ||
        (event.postCreatePolicy === "participants" &&
          event.viewerParticipation?.status === "confirmed")
      : event.viewerCanManage);

  const openDialog = (post?: EventPost) => {
    setEditingPost(post ?? null);
    setTitle(post?.title ?? "");
    setBodyMarkdown(post?.bodyMarkdown ?? "");
    setDialogOpen(true);
  };
  const savePost = () => {
    const body = bodyMarkdown.trim();
    if (!body) {
      toast.error("Post body is required.");
      return;
    }
    const data = {
      title: title.trim() || undefined,
      bodyMarkdown: body,
    };
    const options = {
      onSuccess: () => {
        toast.success("Post saved.");
        setDialogOpen(false);
      },
      onError: (item: unknown) =>
        toast.error(getApiErrorMessage(item, "Failed to save post")),
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
        title={
          isManageMode
            ? "Posts are not enabled for this event."
            : "Updates are not enabled for this event."
        }
        description={
          event.viewerCanManage
            ? "Enable event posts when you are ready to publish updates or let participants discuss."
            : "Posts are not enabled for this event."
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
                    postCreatePolicy:
                      event.postCreatePolicy || "organizers_only",
                  },
                },
                {
                  onSuccess: () => toast.success("Event posts enabled."),
                  onError: (item) =>
                    toast.error(
                      getApiErrorMessage(item, "Failed to enable event posts"),
                    ),
                },
              )
            }
          >
            Enable event posts
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
        {getApiErrorMessage(error, "Event posts could not be loaded.")}
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <DetailSection title={isManageMode ? "Posts" : "Updates"}>
        <div className="flex flex-wrap items-center gap-2">
          {canCreatePost && isManageMode ? (
            <Button
              size="sm"
              onClick={() => openDialog()}
            >
              <MessageSquare className="mr-1 h-4 w-4" />
              New post
            </Button>
          ) : null}
          {canCreatePost && !isManageMode ? (
            <Button
              size="sm"
              nativeButton={false}
              render={
                <Link href={`/events/${encodeURIComponent(event.slug)}/manage#updates`} />
              }
            >
              <MessageSquare className="mr-1 h-4 w-4" />
              New post
            </Button>
          ) : null}
          {event.viewerCanManage && isManageMode ? (
            <Button
              size="sm"
              variant="outline"
              disabled={updateSettingsMutation.isPending}
              onClick={() =>
                updateSettingsMutation.mutate(
                  {
                    eventId: event.id,
                    data: {
                      postsEnabled: event.postsEnabled,
                      postCreatePolicy:
                        event.postCreatePolicy === "participants"
                          ? "organizers_only"
                          : "participants",
                    },
                  },
                  {
                    onSuccess: () => toast.success("Post settings updated."),
                    onError: (item) =>
                      toast.error(
                        getApiErrorMessage(
                          item,
                          "Failed to update post settings",
                        ),
                      ),
                  },
                )
              }
            >
              {event.postCreatePolicy === "participants"
                ? "Organizers only"
                : "Allow participants"}
            </Button>
          ) : null}
        </div>
      </DetailSection>
      {posts.length === 0 ? (
        <CommunityEmptyState
          title={isManageMode ? "No posts yet" : "No updates yet."}
          description={
            event.viewerCanManage
              ? "No updates yet. Post announcements, schedule changes, or reminders for participants."
              : "Event updates will appear here."
          }
        />
      ) : (
        <div className="divide-y divide-border/70 border-y border-border/70">
          {posts.map((post) => {
            const canEdit =
              isManageMode &&
              (event.viewerCanManage || post.authorUserId === viewerUserId);
            return (
              <article key={post.id} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
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
                      Edit post
                    </Button>
                  ) : null}
                </div>
                <ChikaMarkdown content={post.bodyMarkdown} className="mt-3" />
              </article>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl!">
          <DialogHeader>
            <DialogTitle>{editingPost ? "Edit post" : "New post"}</DialogTitle>
            <DialogDescription>
              Post updates, announcements, or participant discussion for this
              event.
            </DialogDescription>
          </DialogHeader>
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
                            toast.success("Post updated.");
                            setDialogOpen(false);
                          },
                          onError: (item) =>
                            toast.error(
                              getApiErrorMessage(item, "Failed to update post"),
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
                          toast.success("Post deleted.");
                          setDialogOpen(false);
                        },
                        onError: (item) =>
                          toast.error(
                            getApiErrorMessage(item, "Failed to delete post"),
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

  if (!event.isPaid) {
    return (
      <StatusPanel
        title="This event is free"
        description="No payment is needed."
      />
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
  onUpdateRole,
  onVerifyPayment,
  onRejectPayment,
  onViewPaymentProof,
  viewingPaymentProofId,
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
  viewingPaymentProofId?: string;
  showOrganizerActions?: boolean;
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
        showOrganizerActions && event.viewerCanManage
          ? "Participants and payments"
          : "Participants"
      }
    >
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <Badge variant="outline" className="h-6 px-2 text-[11px]">
          {event.goingCount ?? event.currentAttendees} going
        </Badge>
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
              <Link href={`/events/${encodeURIComponent(event.slug)}/manage#participants`} />
            }
          >
            Manage participants
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
              {event.viewerCanManage && showOrganizerActions ? (
                <OrganizerActions
                  participant={participant}
                  onApprove={onApprove}
                  onReject={onReject}
                  onUpdateRole={onUpdateRole}
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
  onUpdateRole,
  onVerifyPayment,
  onRejectPayment,
  onViewPaymentProof,
  viewingPaymentProofId,
}: {
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
      {participant.status === "confirmed" ? (
        participant.role === "organizer" ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onUpdateRole(participant.id, "participant")}
          >
            Make participant
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onUpdateRole(participant.id, "organizer")}
          >
            Make organizer
          </Button>
        )
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

type OrganizerSetupEditor =
  | "description"
  | "schedule"
  | "capacity"
  | "payment"
  | "fit"
  | "logistics"
  | "posts";

const EVENT_DETAIL_TIMEZONE = "Asia/Manila";

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
  const [postsEnabled, setPostsEnabled] = useState(event.postsEnabled);
  const [postCreatePolicy, setPostCreatePolicy] =
    useState<EventPostCreatePolicy>(
      event.postCreatePolicy || "organizers_only",
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

  const savePostSettings = () => {
    savePatch(
      {
        postsEnabled,
        postCreatePolicy,
      },
      "Post settings saved.",
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
        <ManageRow
          title="Event posts"
          status={
            event.postsEnabled
              ? event.postCreatePolicy === "participants"
                ? "Participants can post"
                : "Organizers only"
              : "Disabled"
          }
          actionLabel="Edit"
          onAction={() => setActiveEditor("posts")}
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
                  items={[
                    { value: "MANUAL_QR", label: "QR payment" },
                    { value: "MANUAL_BANK_TRANSFER", label: "Bank transfer" },
                  ]}
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

      <Dialog
        open={activeEditor === "posts"}
        onOpenChange={(open) => setActiveEditor(open ? "posts" : null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage event posts</DialogTitle>
            <DialogDescription>
              Control whether the event has posts and who can create them.
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
                Posts enabled
              </span>
              <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                Show the Posts tab to confirmed participants and organizers.
              </span>
            </span>
          </label>
          <SetupField label="Who can create posts">
            <Select
              value={postCreatePolicy}
              items={[
                { value: "organizers_only", label: "Organizers only" },
                {
                  value: "participants",
                  label: "Participants and organizers",
                },
              ]}
              onValueChange={(value) =>
                setPostCreatePolicy(value as EventPostCreatePolicy)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="organizers_only">Organizers only</SelectItem>
                <SelectItem value="participants">
                  Participants and organizers
                </SelectItem>
              </SelectContent>
            </Select>
          </SetupField>
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

function getPaymentMethodLabel(method: EventPaymentMethod) {
  const name = method.name?.trim();
  if (name) return name;
  if (method.type === "MANUAL_BANK_TRANSFER") return "Bank transfer";
  if (method.type === "MANUAL_QR") return "QR payment";
  return "Payment method";
}

function prizePlacementLabel(prize: EventPrize) {
  if (prize.placementLabel) return prize.placementLabel;
  return (
    prizePlacementOptions.find((option) => option.value === prize.placement)
      ?.label ?? titleCase(prize.placement)
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

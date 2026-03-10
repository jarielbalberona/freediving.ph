"use client";

import Link from "next/link";
import { SignInButton } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Compass,
  HeartHandshake,
  MessageCircleMore,
  Plus,
  ShieldCheck,
  Share2,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";

import type {
  BuddyFinderIntent,
  BuddyFinderPreviewIntent,
  BuddyProfile,
  IncomingBuddyRequest,
  OutgoingBuddyRequest,
} from "@freediving.ph/types";

import { TrustCard } from "@/components/trust-card";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/features/auth/session";
import { buddyFinderApi } from "@/features/buddies/api/buddy-finder";
import {
  useAcceptBuddyRequest,
  useCancelBuddyRequest,
  useDeclineBuddyRequest,
  useRemoveBuddy,
  useSendBuddyRequest,
} from "@/features/buddies/hooks/mutations";
import {
  useBuddies,
  useIncomingBuddyRequests,
  useOutgoingBuddyRequests,
} from "@/features/buddies/hooks/queries";
import { messagesApi } from "@/features/messages/api/messages";
import {
  useSaveUser,
  useUnsaveUser,
} from "@/features/profiles/hooks/mutations";
import { useMyProfile, useSavedHub } from "@/features/profiles/hooks/queries";
import { getProfileRoute } from "@/lib/routes";
import { getApiErrorMessage } from "@/lib/http/api-error";

type IntentDraft = {
  area: string;
  intentType: IntentType;
  timeWindow: TimeWindow;
  dateStart: string;
  dateEnd: string;
  note: string;
};

type IntentType = "training" | "fun_dive" | "depth" | "pool" | "line_training";
type TimeWindow = "today" | "weekend" | "specific_date";

const INTENT_TYPE_ITEMS: Array<{ value: IntentType; label: string }> = [
  { value: "training", label: "Training" },
  { value: "fun_dive", label: "Fun dive" },
  { value: "depth", label: "Depth session" },
  { value: "pool", label: "Pool training" },
  { value: "line_training", label: "Line training" },
];

const INTENT_FILTER_ITEMS = [
  { value: "all", label: "All posts" },
  ...INTENT_TYPE_ITEMS,
] as const;

const TIME_WINDOW_ITEMS: Array<{ value: TimeWindow; label: string }> = [
  { value: "today", label: "Today" },
  { value: "weekend", label: "This weekend" },
  { value: "specific_date", label: "Specific dates" },
];

const TIME_WINDOW_FILTER_ITEMS = [
  { value: "all", label: "Any time" },
  ...TIME_WINDOW_ITEMS,
] as const;

export default function BuddiesPage() {
  const session = useSession();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const isSignedIn = session.status === "signed_in";

  const { data: meProfile } = useMyProfile(isSignedIn);
  const buddiesQuery = useBuddies(isSignedIn);
  const incomingQuery = useIncomingBuddyRequests(isSignedIn);
  const outgoingQuery = useOutgoingBuddyRequests(isSignedIn);
  const { data: savedHub } = useSavedHub(isSignedIn);

  const saveUserMutation = useSaveUser();
  const unsaveUserMutation = useUnsaveUser();
  const sendBuddyRequestMutation = useSendBuddyRequest();
  const acceptBuddyRequestMutation = useAcceptBuddyRequest();
  const declineBuddyRequestMutation = useDeclineBuddyRequest();
  const cancelBuddyRequestMutation = useCancelBuddyRequest();
  const removeBuddyMutation = useRemoveBuddy();

  const defaultArea =
    searchParams.get("area") ?? meProfile?.profile.homeArea ?? "";

  const [area, setArea] = useState(defaultArea);
  const [intentType, setIntentType] = useState<"" | IntentType>("");
  const [timeWindow, setTimeWindow] = useState<"" | TimeWindow>("");
  const [newIntent, setNewIntent] = useState<IntentDraft>({
    area: defaultArea,
    intentType: "training",
    timeWindow: "weekend",
    dateStart: "",
    dateEnd: "",
    note: "",
  });

  useEffect(() => {
    if (!defaultArea) return;
    setArea((current) => current || defaultArea);
    setNewIntent((current) =>
      current.area ? current : { ...current, area: defaultArea },
    );
  }, [defaultArea]);

  const previewQuery = useQuery({
    queryKey: ["buddy-finder", "preview", area],
    queryFn: () => buddyFinderApi.preview(area || undefined, 10),
  });

  const intentsQuery = useQuery({
    queryKey: ["buddy-finder", "intents", { area, intentType, timeWindow }],
    queryFn: () =>
      buddyFinderApi.listIntents({
        area: area || undefined,
        intentType: intentType || undefined,
        timeWindow: timeWindow || undefined,
        limit: 20,
      }),
    enabled: isSignedIn,
  });

  const myIntentsQuery = useQuery({
    queryKey: ["buddy-finder", "mine"],
    queryFn: () => buddyFinderApi.listMine(),
    enabled: isSignedIn,
  });

  const createIntentMutation = useMutation({
    mutationFn: buddyFinderApi.createIntent,
    onSuccess: () => {
      setNewIntent((current) => ({
        ...current,
        dateStart: "",
        dateEnd: "",
        note: "",
      }));
      toast.success("Availability posted.");
      queryClient.invalidateQueries({ queryKey: ["buddy-finder"] });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to post availability"));
    },
  });

  const deleteIntentMutation = useMutation({
    mutationFn: (intentId: string) => buddyFinderApi.deleteIntent(intentId),
    onSuccess: () => {
      toast.success("Availability removed.");
      queryClient.invalidateQueries({ queryKey: ["buddy-finder"] });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to remove availability"));
    },
  });

  const messageMutation = useMutation({
    mutationFn: async (intent: BuddyFinderIntent) => {
      const entry = await buddyFinderApi.messageEntry(intent.id);
      const thread = await messagesApi.openDirectThread({
        targetUserId: entry.recipientUserId,
      });
      await messagesApi.sendThreadMessage(thread.id, {
        body: `Saw your availability post for ${intent.area}. Are you still looking for a dive partner?`,
      });
    },
    onSuccess: () => {
      toast.success("Message request sent.");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to send message request"));
    },
  });

  const buddies = buddiesQuery.data?.items ?? [];
  const incoming = incomingQuery.data?.items ?? [];
  const outgoing = outgoingQuery.data?.items ?? [];
  const memberItems = intentsQuery.data?.items ?? [];
  const myIntents = myIntentsQuery.data?.items ?? [];
  const previewItems = previewQuery.data?.items ?? [];
  const savedUserIds = new Set(
    (savedHub?.users ?? []).map((item) => item.userId),
  );
  const buddyUserIds = new Set(buddies.map((item) => item.userId));
  const incomingByUserId = new Map(
    incoming.map((item) => [item.requester.userId, item]),
  );
  const outgoingByUserId = new Map(
    outgoing.map((item) => [item.target.userId, item]),
  );

  const counts = {
    buddies: buddies.length,
    incoming: incoming.length,
    outgoing: outgoing.length,
    activePosts: myIntents.length,
    preview: previewQuery.data?.count ?? 0,
  };

  const shareBuddy = async (intentId: string) => {
    const url = `${window.location.origin}/buddy/${intentId}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Freediving Philippines Buddy Finder",
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
      }
      toast.success("Share link copied.");
    } catch {
      toast.error("Unable to share this link right now.");
    }
  };

  const handleSendBuddyRequest = async (targetUserId: string) => {
    try {
      const response = await sendBuddyRequestMutation.mutateAsync(targetUserId);
      toast.success(
        response.request.status === "accepted"
          ? "You are now buddies."
          : "Buddy request sent.",
      );
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to send buddy request"));
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await acceptBuddyRequestMutation.mutateAsync(requestId);
      toast.success("Buddy request accepted.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to accept buddy request"));
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    try {
      await declineBuddyRequestMutation.mutateAsync(requestId);
      toast.success("Buddy request declined.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to decline buddy request"));
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      await cancelBuddyRequestMutation.mutateAsync(requestId);
      toast.success("Buddy request cancelled.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to cancel buddy request"));
    }
  };

  const handleRemoveBuddy = async (buddyUserId: string) => {
    try {
      await removeBuddyMutation.mutateAsync(buddyUserId);
      toast.success("Buddy removed.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to remove buddy"));
    }
  };

  const handleSaveToggle = async (userId: string) => {
    try {
      if (savedUserIds.has(userId)) {
        await unsaveUserMutation.mutateAsync(userId);
        toast.success("Removed from saved.");
      } else {
        await saveUserMutation.mutateAsync(userId);
        toast.success("Saved for later.");
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to update saved list"));
    }
  };

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.12),_transparent_28%),linear-gradient(180deg,_hsl(var(--background))_0%,_hsl(var(--muted)/0.35)_100%)] px-3 py-4 sm:px-5 sm:py-5 lg:px-8 lg:py-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:gap-5 lg:gap-6">
        <section className="overflow-hidden rounded-[1.4rem] border border-border/70 bg-card/95 shadow-sm sm:rounded-[1.75rem]">
          <div className="grid gap-4 p-4 sm:gap-5 sm:p-5 lg:grid-cols-[1.2fr_0.8fr] lg:gap-6 lg:p-7">
            <div className="space-y-3 sm:space-y-4">
              <Badge className="w-fit rounded-full bg-primary px-2.5 py-0.5 text-[10px] text-primary-foreground sm:px-3 sm:py-1 sm:text-xs">
                Buddies hub
              </Badge>
              <div className="space-y-2 sm:space-y-3">
                <h1 className="max-w-3xl font-serif text-[1.75rem] leading-tight tracking-tight text-foreground sm:text-4xl lg:text-[2.8rem]">
                  Find buddies and coordinate sessions.
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[15px]">
                  Connect with divers for upcoming sessions or build your long-term dive network.
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-3 sm:gap-3">
                <StatCard
                  label={isSignedIn ? "Buddies" : "Active posts"}
                  value={String(isSignedIn ? counts.buddies : counts.preview)}
                  icon={<Users className="h-4 w-4" />}
                />
                <StatCard
                  label={
                    isSignedIn ? "Requests" : "Messaging"
                  }
                  value={String(isSignedIn ? counts.incoming : 1)}
                  icon={<HeartHandshake className="h-4 w-4" />}
                />
                <StatCard
                  label={isSignedIn ? "Your posts" : "Areas"}
                  value={String(isSignedIn ? counts.activePosts : 0)}
                  icon={<ShieldCheck className="h-4 w-4" />}
                />
              </div>
            </div>

            <Card className="border-border/70 bg-[linear-gradient(180deg,_hsl(var(--primary)/0.16)_0%,_hsl(var(--card))_100%)]">
              <CardHeader className="space-y-2 p-4 sm:space-y-3 sm:p-6">
                <CardTitle className="text-lg text-foreground sm:text-xl">
                  {isSignedIn ? "Buddy Finder" : "Guest Preview"}
                </CardTitle>
                <CardDescription className="text-sm text-foreground/75">
                  {isSignedIn
                    ? "Post your availability to find partners for specific sessions, or build your buddy list for future dives."
                    : "Browse availability by area. Sign in to connect and coordinate."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 p-4 pt-0 text-sm text-foreground/80 sm:space-y-4 sm:p-6 sm:pt-0">
                <div className="rounded-2xl border border-border/60 bg-background/80 p-3 sm:rounded-3xl sm:p-4">
                  <p className="font-medium text-foreground">
                    Privacy First
                  </p>
                  <p className="mt-1">
                    Exact locations are private. Guest view only shows general areas and times.
                  </p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background/80 p-3 sm:rounded-3xl sm:p-4">
                  <p className="font-medium text-foreground">
                    Member Features
                  </p>
                  <p className="mt-1">
                    Sign in to see profiles, send messages, and manage your buddy connections.
                  </p>
                </div>
                {!isSignedIn ? (
                  <SignInButton mode="modal">
                    <Button className="w-full" size="default">
                      Sign in to manage buddies
                    </Button>
                  </SignInButton>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </section>

        {isSignedIn ? (
          <>
            <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <Card className="rounded-[1.4rem] border-border/70 bg-card/95 sm:rounded-[1.75rem]">
                <CardHeader className="gap-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-primary">
                    <Users className="h-4 w-4" />
                    Your buddies
                  </div>
                  <CardTitle className="text-xl sm:text-2xl">
                    Network & Requests
                  </CardTitle>
                  <CardDescription>
                    Manage your trusted dive partners and incoming connections.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="buddies" className="gap-5">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="buddies">
                        Buddies ({counts.buddies})
                      </TabsTrigger>
                      <TabsTrigger value="incoming">
                        Incoming ({counts.incoming})
                      </TabsTrigger>
                      <TabsTrigger value="outgoing">
                        Outgoing ({counts.outgoing})
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="buddies" className="space-y-3">
                      {buddies.length > 0 ? (
                        buddies.map((item) => (
                          <RelationshipCard
                            key={item.userId}
                            profile={item}
                            description="Trusted connection"
                            actions={
                              <>
                                <Link
                                  className="text-sm font-medium text-primary hover:underline"
                                  href={getProfileRoute(item.username)}
                                >
                                  View profile
                                </Link>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  disabled={removeBuddyMutation.isPending}
                                  onClick={() =>
                                    void handleRemoveBuddy(item.userId)
                                  }
                                >
                                  Remove
                                </Button>
                              </>
                            }
                          />
                        ))
                      ) : (
                        <EmptyState
                          title="No buddies yet"
                          description="Use the Buddy Finder feed below or send requests from member profiles when someone looks reliable."
                        />
                      )}
                    </TabsContent>
                    <TabsContent value="incoming" className="space-y-3">
                      {incoming.length > 0 ? (
                        incoming.map((item) => (
                          <RelationshipCard
                            key={item.request.id}
                            profile={item.requester}
                            description={`Requested ${formatTimestamp(item.request.createdAt)}`}
                            actions={
                              <>
                                <Button
                                  size="sm"
                                  disabled={
                                    acceptBuddyRequestMutation.isPending
                                  }
                                  onClick={() =>
                                    void handleAcceptRequest(item.request.id)
                                  }
                                >
                                  Accept
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={
                                    declineBuddyRequestMutation.isPending
                                  }
                                  onClick={() =>
                                    void handleDeclineRequest(item.request.id)
                                  }
                                >
                                  Decline
                                </Button>
                              </>
                            }
                          />
                        ))
                      ) : (
                        <EmptyState
                          title="No incoming requests"
                          description="When someone asks to connect, it will show up here."
                        />
                      )}
                    </TabsContent>
                    <TabsContent value="outgoing" className="space-y-3">
                      {outgoing.length > 0 ? (
                        outgoing.map((item) => (
                          <RelationshipCard
                            key={item.request.id}
                            profile={item.target}
                            description={`Pending since ${formatTimestamp(item.request.createdAt)}`}
                            actions={
                              <>
                                <Badge variant="outline">Pending</Badge>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={
                                    cancelBuddyRequestMutation.isPending
                                  }
                                  onClick={() =>
                                    void handleCancelRequest(item.request.id)
                                  }
                                >
                                  Cancel
                                </Button>
                              </>
                            }
                          />
                        ))
                      ) : (
                        <EmptyState
                          title="No outgoing requests"
                          description="Send buddy requests when you want a persistent connection, not just a one-off session."
                        />
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              <Card className="rounded-[1.4rem] border-border/70 bg-card/95 sm:rounded-[1.75rem]">
                <CardHeader className="gap-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-primary">
                    <Plus className="h-4 w-4" />
                    Post availability
                  </div>
                  <CardTitle className="text-xl sm:text-2xl">
                    Post Availability
                  </CardTitle>
                  <CardDescription>
                    Let others know when and where you want to dive.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-3">
                    <div className="space-y-2">
                      <Label>Area</Label>
                      <Input
                        value={newIntent.area}
                        onChange={(event) =>
                          setNewIntent((current) => ({
                            ...current,
                            area: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Session type</Label>
                        <Select
                          value={newIntent.intentType}
                          onValueChange={(value) =>
                            setNewIntent((current) => ({
                              ...current,
                              intentType: value as IntentType,
                            }))
                          }
                          items={INTENT_TYPE_ITEMS}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {INTENT_TYPE_ITEMS.map((item) => (
                              <SelectItem key={item.value} value={item.value}>
                                {item.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Time window</Label>
                        <Select
                          value={newIntent.timeWindow}
                          onValueChange={(value) =>
                            setNewIntent((current) => ({
                              ...current,
                              timeWindow: value as TimeWindow,
                            }))
                          }
                          items={TIME_WINDOW_ITEMS}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TIME_WINDOW_ITEMS.map((item) => (
                              <SelectItem key={item.value} value={item.value}>
                                {item.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {newIntent.timeWindow === "specific_date" ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Date start</Label>
                          <Input
                            type="date"
                            value={newIntent.dateStart}
                            onChange={(event) =>
                              setNewIntent((current) => ({
                                ...current,
                                dateStart: event.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Date end</Label>
                          <Input
                            type="date"
                            value={newIntent.dateEnd}
                            onChange={(event) =>
                              setNewIntent((current) => ({
                                ...current,
                                dateEnd: event.target.value,
                              }))
                            }
                          />
                        </div>
                      </div>
                    ) : null}
                    <div className="space-y-2">
                      <Label>Short note</Label>
                      <Textarea
                        placeholder="Example: Looking for a line training partner for Saturday morning. Comfortable in 20-30m sessions."
                        value={newIntent.note}
                        onChange={(event) =>
                          setNewIntent((current) => ({
                            ...current,
                            note: event.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="rounded-3xl border border-border/70 bg-muted/45 p-4 text-sm text-muted-foreground">
                    Area stays coarse. Conversations start in request mode unless you are already buddies.
                  </div>

                  <Button
                    className="w-full"
                    disabled={createIntentMutation.isPending}
                    onClick={() =>
                      createIntentMutation.mutate({
                        area: newIntent.area,
                        intentType: newIntent.intentType,
                        timeWindow: newIntent.timeWindow,
                        dateStart: newIntent.dateStart || undefined,
                        dateEnd: newIntent.dateEnd || undefined,
                        note: newIntent.note || undefined,
                      })
                    }
                  >
                    {createIntentMutation.isPending
                      ? "Posting availability..."
                      : "Post availability"}
                  </Button>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-foreground">
                        Your active posts
                      </h3>
                      <span className="text-xs text-muted-foreground">
                        Posts expire automatically.
                      </span>
                    </div>
                    {myIntents.length > 0 ? (
                      myIntents.map((item) => (
                        <Card
                          key={item.id}
                          className="border-border/60 bg-background/80"
                        >
                          <CardContent className="flex flex-wrap items-start justify-between gap-3 p-4">
                            <div className="space-y-2">
                              <div className="flex flex-wrap gap-2">
                                <Badge>
                                  {labelForIntentType(item.intentType)}
                                </Badge>
                                <Badge variant="outline">
                                  {labelForTimeWindow(item.timeWindow)}
                                </Badge>
                              </div>
                              <p className="text-sm font-medium text-foreground">
                                {item.area}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {item.note || "No note added."}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Expires {formatTimestamp(item.expiresAt)}
                              </p>
                            </div>
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={deleteIntentMutation.isPending}
                              onClick={() =>
                                deleteIntentMutation.mutate(item.id)
                              }
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Remove
                            </Button>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <EmptyState
                        title="No active availability posts"
                        description="Post when you have a real session in mind. Empty stale posts are useless."
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            </section>

            <section className="space-y-4 rounded-[1.4rem] border border-border/70 bg-card/95 p-4 shadow-sm sm:rounded-[1.75rem] sm:p-5 lg:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-primary">
                    <Compass className="h-4 w-4" />
                    Find dive partners
                  </div>
                  <h2 className="font-serif text-3xl tracking-tight text-foreground">
                    Community Availability
                  </h2>
                  <p className="max-w-2xl text-sm text-muted-foreground">
                    Browse active sessions and find divers looking for partners.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Input
                    placeholder="Area or city"
                    value={area}
                    onChange={(event) => setArea(event.target.value)}
                  />
                  <Select
                    value={intentType || "all"}
                    onValueChange={(value) =>
                      setIntentType(
                        value === "all" ? "" : (value as IntentType),
                      )
                    }
                    items={INTENT_FILTER_ITEMS}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All posts" />
                    </SelectTrigger>
                    <SelectContent>
                      {INTENT_FILTER_ITEMS.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={timeWindow || "all"}
                    onValueChange={(value) =>
                      setTimeWindow(
                        value === "all" ? "" : (value as TimeWindow),
                      )
                    }
                    items={TIME_WINDOW_FILTER_ITEMS}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any time" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_WINDOW_FILTER_ITEMS.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {intentsQuery.error ? (
                <ErrorBlock
                  message={getApiErrorMessage(
                    intentsQuery.error,
                    "Failed to load Buddy Finder posts",
                  )}
                />
              ) : null}

              <div className="grid gap-4 xl:grid-cols-2">
                {memberItems.map((item) => (
                  <IntentCard
                    key={item.id}
                    intent={item}
                    isSaved={savedUserIds.has(item.authorAppUserId)}
                    isBuddy={buddyUserIds.has(item.authorAppUserId)}
                    incomingRequest={incomingByUserId.get(item.authorAppUserId)}
                    outgoingRequest={outgoingByUserId.get(item.authorAppUserId)}
                    onSaveToggle={() =>
                      void handleSaveToggle(item.authorAppUserId)
                    }
                    onShare={() => void shareBuddy(item.id)}
                    onMessage={() => messageMutation.mutate(item)}
                    onSendBuddyRequest={() =>
                      void handleSendBuddyRequest(item.authorAppUserId)
                    }
                    onAcceptRequest={(requestId) =>
                      void handleAcceptRequest(requestId)
                    }
                    onDeclineRequest={(requestId) =>
                      void handleDeclineRequest(requestId)
                    }
                    onCancelRequest={(requestId) =>
                      void handleCancelRequest(requestId)
                    }
                    actionLoading={
                      sendBuddyRequestMutation.isPending ||
                      acceptBuddyRequestMutation.isPending ||
                      declineBuddyRequestMutation.isPending ||
                      cancelBuddyRequestMutation.isPending ||
                      saveUserMutation.isPending ||
                      unsaveUserMutation.isPending ||
                      messageMutation.isPending
                    }
                  />
                ))}
              </div>

              {memberItems.length === 0 && !intentsQuery.isPending ? (
                <EmptyState
                  title="No matching availability posts"
                  description="Try a broader area or clear the filters. If nothing shows up, that means nobody useful has posted yet."
                />
              ) : null}
            </section>
          </>
        ) : (
            <section className="space-y-4 rounded-[1.4rem] border border-border/70 bg-card/95 p-4 shadow-sm sm:rounded-[1.75rem] sm:p-5 lg:p-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                  <ShieldCheck className="h-4 w-4" />
                  Public preview
                </div>
                <h2 className="font-serif text-3xl tracking-tight text-foreground">
                  Public Preview
                </h2>
                <p className="max-w-2xl text-sm text-muted-foreground">
                  Sign in to see full profiles, send messages, and connect with buddies.
                </p>
              </div>
              <div className="w-full max-w-sm">
                <Input
                  placeholder="Area or city"
                  value={area}
                  onChange={(event) => setArea(event.target.value)}
                />
              </div>
            </div>

            {previewQuery.error ? (
              <ErrorBlock
                message={getApiErrorMessage(
                  previewQuery.error,
                  "Failed to load guest preview",
                )}
              />
            ) : null}

            <div className="grid gap-4 xl:grid-cols-2">
              {previewItems.map((item) => (
                <PreviewCard key={item.id} item={item} />
              ))}
            </div>

            {previewItems.length === 0 && !previewQuery.isPending ? (
              <EmptyState
                title="No public preview posts in this area"
                description="Try a broader area or sign in and post your own availability."
              />
            ) : null}

            <Card className="border-dashed border-primary/30 bg-primary/5">
              <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-lg font-semibold text-foreground">
                    Sign in to connect
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Messaging, saving, and buddy requests are for signed-in members.
                  </p>
                </div>
                <SignInButton mode="modal">
                  <Button size="lg">Sign in to manage buddies</Button>
                </SignInButton>
              </CardContent>
            </Card>
          </section>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/80 p-3 sm:rounded-3xl sm:p-4">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-xl font-semibold text-foreground sm:mt-3 sm:text-2xl">{value}</p>
    </div>
  );
}

function RelationshipCard({
  profile,
  description,
  actions,
}: {
  profile: BuddyProfile;
  description: string;
  actions: ReactNode;
}) {
  return (
    <Card className="border-border/60 bg-background/70">
      <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
        <div className="flex items-center gap-3">
          <UserAvatar
            src={profile.avatarUrl}
            displayName={profile.displayName || profile.username}
          />
          <div>
            <p className="font-medium text-foreground">
              {profile.displayName || profile.username}
            </p>
            <p className="text-sm text-muted-foreground">@{profile.username}</p>
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      </CardContent>
    </Card>
  );
}

function IntentCard({
  intent,
  isSaved,
  isBuddy,
  incomingRequest,
  outgoingRequest,
  onSaveToggle,
  onShare,
  onMessage,
  onSendBuddyRequest,
  onAcceptRequest,
  onDeclineRequest,
  onCancelRequest,
  actionLoading,
}: {
  intent: BuddyFinderIntent;
  isSaved: boolean;
  isBuddy: boolean;
  incomingRequest?: IncomingBuddyRequest;
  outgoingRequest?: OutgoingBuddyRequest;
  onSaveToggle: () => void;
  onShare: () => void;
  onMessage: () => void;
  onSendBuddyRequest: () => void;
  onAcceptRequest: (requestId: string) => void;
  onDeclineRequest: (requestId: string) => void;
  onCancelRequest: (requestId: string) => void;
  actionLoading: boolean;
}) {
  const title = intent.displayName || intent.username;

  return (
    <Card className="overflow-hidden rounded-[1.75rem] border-border/70 bg-background/80">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <UserAvatar src={intent.avatarUrl} displayName={title} />
            <div>
              <Link
                href={getProfileRoute(intent.username)}
                className="text-lg font-semibold text-foreground transition-colors hover:text-primary"
              >
                {title}
              </Link>
              <p className="text-sm text-muted-foreground">
                {intent.homeArea || intent.area}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge>{labelForIntentType(intent.intentType)}</Badge>
            <Badge variant="outline">
              {labelForTimeWindow(intent.timeWindow)}
            </Badge>
          </div>
        </div>

        <p className="text-sm text-foreground/85">
          {intent.note || "No note added."}
        </p>

        <TrustCard
          emailVerified={intent.emailVerified}
          phoneVerified={intent.phoneVerified}
          certLevel={intent.certLevel}
          buddyCount={intent.buddyCount}
          reportCount={intent.reportCount}
        />

        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span>Posted {formatTimestamp(intent.createdAt)}</span>
          {intent.dateStart ? <span>Starts {intent.dateStart}</span> : null}
          {intent.mutualBuddiesCount > 0 ? (
            <span>{intent.mutualBuddiesCount} mutual buddies</span>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={actionLoading}
            onClick={onSaveToggle}
          >
            {isSaved ? "Saved" : "Save"}
          </Button>
          <Button variant="outline" size="sm" onClick={onShare}>
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
          <Button size="sm" disabled={actionLoading} onClick={onMessage}>
            <MessageCircleMore className="mr-2 h-4 w-4" />
            Message
          </Button>
          {isBuddy ? (
            <Badge className="rounded-full bg-primary/10 px-3 py-1 text-primary">
              Already buddies
            </Badge>
          ) : incomingRequest ? (
            <>
              <Button
                size="sm"
                disabled={actionLoading}
                onClick={() => onAcceptRequest(incomingRequest.request.id)}
              >
                Accept request
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={actionLoading}
                onClick={() => onDeclineRequest(incomingRequest.request.id)}
              >
                Decline
              </Button>
            </>
          ) : outgoingRequest ? (
            <>
              <Badge variant="outline" className="rounded-full px-3 py-1">
                Request pending
              </Badge>
              <Button
                variant="outline"
                size="sm"
                disabled={actionLoading}
                onClick={() => onCancelRequest(outgoingRequest.request.id)}
              >
                Cancel request
              </Button>
            </>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              disabled={actionLoading}
              onClick={onSendBuddyRequest}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Send buddy request
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function PreviewCard({ item }: { item: BuddyFinderPreviewIntent }) {
  return (
    <Card className="overflow-hidden rounded-[1.75rem] border-border/70 bg-background/80">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-lg font-semibold text-foreground">
              {labelForIntentType(item.intentType)} in {item.area}
            </p>
            <p className="text-sm text-muted-foreground">
              {labelForTimeWindow(item.timeWindow)}
            </p>
          </div>
          <Badge variant="outline">Safe preview only</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {item.notePreview || "Sign in to reveal the full note."}
        </p>
        <TrustCard
          emailVerified={item.emailVerified}
          phoneVerified={item.phoneVerified}
          certLevel={item.certLevel}
          buddyCount={item.buddyCount}
          reportCount={item.reportCount}
        />
        <p className="text-xs text-muted-foreground">
          Posted {formatTimestamp(item.createdAt)}
        </p>
      </CardContent>
    </Card>
  );
}

function EmptyState({
  title,
  description,
}: { title: string; description: string }) {
  return (
    <Card className="border-dashed border-border/70 bg-background/60">
      <CardContent className="p-6">
        <p className="font-medium text-foreground">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function ErrorBlock({ message }: { message: string }) {
  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardContent className="p-4 text-sm text-destructive">
        {message}
      </CardContent>
    </Card>
  );
}

function labelForIntentType(
  value:
    | IntentType
    | BuddyFinderIntent["intentType"]
    | BuddyFinderPreviewIntent["intentType"],
) {
  return (
    INTENT_TYPE_ITEMS.find((item) => item.value === value)?.label ??
    value.replace("_", " ")
  );
}

function labelForTimeWindow(
  value:
    | TimeWindow
    | BuddyFinderIntent["timeWindow"]
    | BuddyFinderPreviewIntent["timeWindow"],
) {
  return (
    TIME_WINDOW_ITEMS.find((item) => item.value === value)?.label ??
    value.replace("_", " ")
  );
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString();
}

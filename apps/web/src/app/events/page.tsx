"use client";

import { SignInButton } from "@clerk/nextjs";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Event, EventFilters } from "@freediving.ph/types";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  CalendarClock,
  Compass,
  Lock,
  MapPin,
  Plus,
  Search,
  ShieldCheck,
  Ticket,
  Users,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { useSession } from "@/features/auth/session";
import {
  useCreateEvent,
  useEvents,
  useJoinEvent,
  useLeaveEvent,
} from "@/features/events";
import {
  CommunityAccessNote,
  CommunityBrowseToolbar,
  CommunityEmptyState,
  CommunityHeader,
  CommunityPageShell,
  CommunitySectionNav,
  CommunityStats,
} from "@/components/community/community-page";
import {
  buildDisplayLocation,
  LocationSearch,
  type LocationSearchValue,
} from "@/features/locations";
import { getApiErrorMessage, getApiErrorStatus } from "@/lib/http/api-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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

const createEventSchema = z
  .object({
    title: z.string().min(3, "Event title must be at least 3 characters"),
    description: z.string().optional(),
    location: z.string().optional(),
    locationData: z
      .object({
        locationName: z.string().optional(),
        formattedAddress: z.string().optional(),
        regionCode: z.string().optional(),
        provinceCode: z.string().optional(),
        cityCode: z.string().optional(),
        barangayCode: z.string().optional(),
        locationSource: z
          .enum(["manual", "google_places", "psgc_mapped", "unmapped"])
          .optional(),
      })
      .optional(),
    startsAt: z.date().optional(),
    endsAt: z.date().optional(),
    maxAttendees: z.coerce.number().int().min(1).max(500).optional(),
    visibility: z
      .enum(["public", "group_members", "invite_only"])
      .default("public"),
    type: z.string().optional(),
    difficulty: z
      .enum(["beginner", "intermediate", "advanced", "expert"])
      .default("beginner"),
  })
  .refine(
    (data) => !data.endsAt || !data.startsAt || data.endsAt >= data.startsAt,
    {
      message: "End date must be on or after start date",
      path: ["endsAt"],
    },
  );

type CreateEventValues = z.infer<typeof createEventSchema>;

const createEventDefaultValues: CreateEventValues = {
  title: "",
  description: "",
  location: "",
  locationData: {
    locationName: "",
    formattedAddress: "",
    locationSource: "manual",
  },
  startsAt: undefined,
  endsAt: undefined,
  maxAttendees: undefined,
  visibility: "public",
  type: "training",
  difficulty: "beginner",
};

export default function EventsPage() {
  const session = useSession();
  const isSignedIn = session.status === "signed_in";

  const [activeTab, setActiveTab] = useState<"discover" | "joined">("discover");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const filters = useMemo<EventFilters>(
    () => ({
      status: "published",
      page: 1,
      limit: 24,
      search: search.trim() || undefined,
    }),
    [search],
  );

  const todayStart = useMemo(() => {
    const value = new Date();
    value.setHours(0, 0, 0, 0);
    return value;
  }, []);

  const form = useForm<CreateEventValues>({
    resolver: zodResolver(createEventSchema),
    defaultValues: createEventDefaultValues,
  });

  const eventsQuery = useEvents(filters);
  const createEventMutation = useCreateEvent();
  const joinEventMutation = useJoinEvent();
  const leaveEventMutation = useLeaveEvent();

  const allEvents = eventsQuery.data?.events ?? [];
  const joinedEvents = useMemo(
    () => allEvents.filter((event) => event.viewerJoined),
    [allEvents],
  );

  const handleJoinEvent = (eventId: string) => {
    joinEventMutation.mutate(
      { eventId },
      {
        onSuccess: () => toast.success("Joined event."),
        onError: (error) => {
          const statusCode = getApiErrorStatus(error);
          if (statusCode === 401 || statusCode === 403) {
            toast.error(
              "Sign in first, or make sure you actually have access to this event.",
            );
            return;
          }
          toast.error(getApiErrorMessage(error, "Failed to join event"));
        },
      },
    );
  };

  const handleLeaveEvent = (eventId: string) => {
    leaveEventMutation.mutate(
      { eventId },
      {
        onSuccess: () => toast.success("Left event."),
        onError: (error) => {
          const statusCode = getApiErrorStatus(error);
          if (statusCode === 401 || statusCode === 403) {
            toast.error("You do not have permission to leave this event.");
            return;
          }
          toast.error(getApiErrorMessage(error, "Failed to leave event"));
        },
      },
    );
  };

  const onCreateEventSubmit = (values: CreateEventValues) => {
    const locationData = values.locationData ?? {};
    const structuredLocation = buildDisplayLocation(
      locationData as LocationSearchValue,
    );
    const location =
      values.location?.trim() ||
      structuredLocation ||
      locationData.formattedAddress?.trim() ||
      undefined;

    createEventMutation.mutate(
      {
        title: values.title.trim(),
        description: values.description?.trim() || undefined,
        location,
        locationName: locationData.locationName?.trim() || undefined,
        formattedAddress: locationData.formattedAddress?.trim() || undefined,
        regionCode: locationData.regionCode?.trim() || undefined,
        provinceCode: locationData.provinceCode?.trim() || undefined,
        cityCode: locationData.cityCode?.trim() || undefined,
        barangayCode: locationData.barangayCode?.trim() || undefined,
        locationSource: locationData.locationSource || undefined,
        startsAt: values.startsAt?.toISOString(),
        endsAt: values.endsAt?.toISOString(),
        maxAttendees: values.maxAttendees,
        visibility: values.visibility,
        type: values.type?.trim() || "training",
        difficulty: values.difficulty,
        status: "published",
      },
      {
        onSuccess: () => {
          setCreateOpen(false);
          form.reset(createEventDefaultValues);
          toast.success("Event published.");
        },
        onError: (error) => {
          toast.error(getApiErrorMessage(error, "Failed to create event"));
        },
      },
    );
  };

  const visibleEvents = activeTab === "joined" ? joinedEvents : allEvents;

  return (
    <CommunityPageShell>
      <CommunitySectionNav />
      <CommunityHeader
        eyebrow="Events"
        title="Discover dives, trainings, and meetups"
        subtitle="Browse upcoming community plans or publish a session for other freedivers to join."
        action={
          !isSignedIn ? (
            <SignInButton mode="modal">
              <Button size="lg">Sign in to join</Button>
            </SignInButton>
          ) : (
            <Button size="lg" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Publish event
            </Button>
          )
        }
      />

      <CommunityStats
        items={[
          {
            label: "Events",
            value: String(
              eventsQuery.data?.pagination.total ?? allEvents.length,
            ),
            icon: <Compass className="h-4 w-4" />,
          },
          {
            label: "Joined",
            value: isSignedIn ? String(joinedEvents.length) : "0",
            icon: <Ticket className="h-4 w-4" />,
          },
          {
            label: "Access",
            value: "Public or invite-only",
            icon: <ShieldCheck className="h-4 w-4" />,
          },
        ]}
      />

      <CommunityAccessNote>
        Public events are visible to members. Restricted events are limited to
        invitees or group members.
      </CommunityAccessNote>

      <section className="space-y-5">
        <CommunityBrowseToolbar
          label={
            <>
              <CalendarClock className="h-4 w-4" />
              Browse events
            </>
          }
          title="Upcoming plans"
          description="Search by place, session type, or organizer note."
        >
          <div className="grid gap-2 sm:gap-3 lg:min-w-[360px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-10"
                placeholder="Search dives, trainings, or places"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>
        </CommunityBrowseToolbar>

        <Tabs
          className="mt-4 sm:mt-5"
          value={activeTab}
          onValueChange={(value) =>
            setActiveTab(value as "discover" | "joined")
          }
        >
          <TabsList
            className={`grid ${isSignedIn ? "w-full max-w-md grid-cols-2" : "w-full max-w-[220px] grid-cols-1"}`}
          >
            <TabsTrigger value="discover">All events</TabsTrigger>
            {isSignedIn ? (
              <TabsTrigger value="joined">My events</TabsTrigger>
            ) : null}
          </TabsList>

          <TabsContent value="discover" className="mt-4 sm:mt-5">
            <EventGrid
              isLoading={eventsQuery.isLoading}
              error={eventsQuery.error}
              events={visibleEvents}
              isSignedIn={isSignedIn}
              onJoin={handleJoinEvent}
              onLeave={handleLeaveEvent}
              emptyTitle="No upcoming events yet"
              emptyDescription="Publish a dive, training, or meetup to get the calendar moving."
              emptyAction={
                isSignedIn ? (
                  <Button size="sm" onClick={() => setCreateOpen(true)}>
                    Publish event
                  </Button>
                ) : null
              }
            />
          </TabsContent>

          {isSignedIn ? (
            <TabsContent value="joined" className="mt-4 sm:mt-5">
              <EventGrid
                isLoading={eventsQuery.isLoading}
                error={eventsQuery.error}
                events={visibleEvents}
                isSignedIn
                onJoin={handleJoinEvent}
                onLeave={handleLeaveEvent}
                emptyTitle="Your joined events will appear here"
                emptyDescription="When you join a dive, training, or meetup, it will be easy to find again from this tab."
              />
            </TabsContent>
          ) : null}
        </Tabs>
      </section>

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) form.reset(createEventDefaultValues);
        }}
      >
        <DialogContent className="max-w-2xl!">
          <DialogHeader>
            <DialogTitle>Publish event</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onCreateEventSubmit)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Cebu line training, Mabini depth session, Manila pool workshop"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        className="min-h-28"
                        placeholder="Event description"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="locationData"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <LocationSearch
                        value={
                          (field.value ?? {
                            locationName: "",
                            formattedAddress: "",
                            locationSource: "manual",
                          }) as LocationSearchValue
                        }
                        onChange={(value) => {
                          field.onChange(value);
                          form.setValue(
                            "location",
                            buildDisplayLocation(value) ||
                              value.formattedAddress ||
                              "",
                          );
                        }}
                        disabled={createEventMutation.isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event type</FormLabel>
                      <Select
                        value={field.value || "training"}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="training">Training</SelectItem>
                          <SelectItem value="meetup">Meetup</SelectItem>
                          <SelectItem value="competition">
                            Competition
                          </SelectItem>
                          <SelectItem value="trip">Trip</SelectItem>
                          <SelectItem value="workshop">Workshop</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="difficulty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Difficulty</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select difficulty" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="beginner">Beginner</SelectItem>
                          <SelectItem value="intermediate">
                            Intermediate
                          </SelectItem>
                          <SelectItem value="advanced">Advanced</SelectItem>
                          <SelectItem value="expert">Expert</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="visibility"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Visibility</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select visibility" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="public">Public</SelectItem>
                          <SelectItem value="group_members">
                            Group members
                          </SelectItem>
                          <SelectItem value="invite_only">
                            Invite only
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="maxAttendees"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Capacity</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={500}
                          placeholder="Optional attendee cap"
                          value={field.value ?? ""}
                          onChange={(event) =>
                            field.onChange(event.target.value || undefined)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="startsAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start</FormLabel>
                      <FormControl>
                        <DatePicker
                          placeholder="Pick a start date"
                          value={field.value}
                          min={todayStart}
                          onSelect={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endsAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End</FormLabel>
                      <FormControl>
                        <DatePicker
                          placeholder="Pick an end date"
                          value={field.value}
                          min={form.watch("startsAt") ?? todayStart}
                          onSelect={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createEventMutation.isPending}>
                  {createEventMutation.isPending
                    ? "Publishing..."
                    : "Publish event"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </CommunityPageShell>
  );
}

function EventGrid({
  isLoading,
  error,
  events,
  isSignedIn,
  onJoin,
  onLeave,
  emptyTitle,
  emptyDescription,
  emptyAction,
}: {
  isLoading: boolean;
  error: unknown;
  events: Event[];
  isSignedIn: boolean;
  onJoin: (eventId: string) => void;
  onLeave: (eventId: string) => void;
  emptyTitle: string;
  emptyDescription: string;
  emptyAction?: ReactNode;
}) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card className="border-border/70 bg-muted/30">
          <CardContent className="p-5">
            <p className="font-medium text-foreground">
              Checking the community calendar
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              We are looking for upcoming dives, trainings, workshops, and
              meetups.
            </p>
          </CardContent>
        </Card>
        <div className="grid gap-4 xl:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-72 rounded-[1.5rem]" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="p-6 text-sm text-destructive">
          {getApiErrorMessage(
            error,
            "Events are taking longer than expected. Try again in a moment.",
          )}
        </CardContent>
      </Card>
    );
  }

  if (events.length === 0) {
    return (
      <CommunityEmptyState
        title={emptyTitle}
        description={emptyDescription}
        icon={<CalendarClock className="h-9 w-9" />}
        action={emptyAction}
      />
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {events.map((event) => (
        <EventDiscoveryCard
          key={event.id}
          event={event}
          isSignedIn={isSignedIn}
          onJoin={onJoin}
          onLeave={onLeave}
        />
      ))}
    </div>
  );
}

function EventDiscoveryCard({
  event,
  isSignedIn,
  onJoin,
  onLeave,
}: {
  event: Event;
  isSignedIn: boolean;
  onJoin: (eventId: string) => void;
  onLeave: (eventId: string) => void;
}) {
  return (
    <Card className="overflow-hidden rounded-[1.5rem] border-border/70 bg-card/95 shadow-sm">
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="rounded-full bg-primary text-primary-foreground">
            {titleCase(event.type || "training")}
          </Badge>
          <Badge variant="outline">
            {titleCase(event.visibility.replace("_", " "))}
          </Badge>
          <Badge variant="outline">{titleCase(event.difficulty)}</Badge>
        </div>
        <div className="space-y-2">
          <CardTitle className="font-serif text-2xl tracking-tight text-foreground">
            <Link href={`/events/${event.id}`} className="hover:underline">
              {event.title}
            </Link>
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            {event.description?.trim() || "Details have not been added yet."}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
          <InlineFact
            icon={<CalendarClock className="h-4 w-4" />}
            label={formatEventDate(event.startsAt)}
          />
          <InlineFact
            icon={<Users className="h-4 w-4" />}
            label={`${event.currentAttendees}${event.maxAttendees ? ` / ${event.maxAttendees}` : ""} attendees`}
          />
          <InlineFact
            icon={<MapPin className="h-4 w-4" />}
            label={event.location || "Location not set"}
          />
          <InlineFact
            icon={
              event.visibility === "public" ? (
                <Compass className="h-4 w-4" />
              ) : (
                <Lock className="h-4 w-4" />
              )
            }
            label={
              event.visibility === "public"
                ? "Public discovery"
                : "Restricted visibility"
            }
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href={`/events/${event.id}`}>
            <Button variant="outline">Open details</Button>
          </Link>
          {isSignedIn ? (
            event.viewerJoined ? (
              <Button variant="outline" onClick={() => onLeave(event.id)}>
                Leave event
              </Button>
            ) : (
              <Button
                onClick={() => onJoin(event.id)}
                disabled={event.status !== "published"}
              >
                Join event
              </Button>
            )
          ) : (
            <SignInButton mode="modal">
              <Button>Sign in to join</Button>
            </SignInButton>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function InlineFact({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex items-start gap-2 rounded-2xl border border-border/60 bg-background/70 p-3">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <span>{label}</span>
    </div>
  );
}

function formatEventDate(value?: string) {
  if (!value) return "Schedule not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Schedule not set";
  return date.toLocaleString();
}

function titleCase(value: string) {
  return value
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

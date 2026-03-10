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
  Filter,
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
  .refine((data) => !data.endsAt || !data.startsAt || data.endsAt >= data.startsAt, {
    message: "End date must be on or after start date",
    path: ["endsAt"],
  });

type CreateEventValues = z.infer<typeof createEventSchema>;
type StatusFilter = "published" | "draft" | "cancelled" | "completed" | "all";

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
  const [status, setStatus] = useState<StatusFilter>("published");
  const [createOpen, setCreateOpen] = useState(false);

  const filters = useMemo<EventFilters>(
    () => ({
      status: status === "all" ? undefined : status,
      page: 1,
      limit: 24,
      search: search.trim() || undefined,
    }),
    [search, status],
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
    <div className="min-h-full bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.1),_transparent_26%),linear-gradient(180deg,_hsl(var(--background))_0%,_hsl(var(--muted)/0.24)_100%)] px-3 py-4 sm:px-5 sm:py-5 lg:px-8 lg:py-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:gap-5 lg:gap-6">
        <section className="overflow-hidden rounded-[1.4rem] border border-border/70 bg-card/95 shadow-sm sm:rounded-[1.75rem]">
          <div className="grid gap-4 p-4 sm:gap-5 sm:p-5 lg:grid-cols-[1.15fr_0.85fr] lg:gap-6 lg:p-7">
            <div className="space-y-3 sm:space-y-4">
              <Badge className="w-fit rounded-full bg-primary px-2.5 py-0.5 text-[10px] text-primary-foreground sm:px-3 sm:py-1 sm:text-xs">
                Events
              </Badge>
              <div className="space-y-2 sm:space-y-3">
                <h1 className="max-w-3xl font-serif text-[1.75rem] leading-tight tracking-tight text-foreground sm:text-4xl lg:text-[2.8rem]">
                  Dives, trainings, and meetups.
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[15px]">
                  Find out what's happening in the community and join in.
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-3 sm:gap-3">
                <EventStatCard
                  label="Events"
                  value={String(eventsQuery.data?.pagination.total ?? allEvents.length)}
                  icon={<Compass className="h-4 w-4" />}
                />
                <EventStatCard
                  label={isSignedIn ? "Joined" : "Public"}
                  value={isSignedIn ? String(joinedEvents.length) : "View only"}
                  icon={<Ticket className="h-4 w-4" />}
                />
                <EventStatCard
                  label="Access"
                  value="Managed"
                  icon={<ShieldCheck className="h-4 w-4" />}
                />
              </div>
            </div>

            <Card className="border-border/70 bg-[linear-gradient(180deg,_hsl(var(--primary)/0.14)_0%,_hsl(var(--card))_100%)]">
              <CardHeader className="space-y-2 p-4 sm:space-y-3 sm:p-6">
                <CardTitle className="text-lg text-foreground sm:text-xl">
                  {isSignedIn ? "Events" : "Public Events"}
                </CardTitle>
                <CardDescription className="text-sm text-foreground/75">
                  {isSignedIn
                    ? "Join upcoming sessions or publish your own to gather a crew."
                    : "Browse public events. Sign in to join or host."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 p-4 pt-0 text-sm text-foreground/80 sm:space-y-4 sm:p-6 sm:pt-0">
                <InfoBox
                  title="Public Events"
                  description="Visible to everyone."
                />
                <InfoBox
                  title="Restricted Events"
                  description="Only visible to group members or invitees."
                />
                {!isSignedIn ? (
                  <SignInButton mode="modal">
                    <Button className="w-full" size="default">
                      Sign in to join events
                    </Button>
                  </SignInButton>
                ) : (
                  <Button
                    className="w-full"
                    size="default"
                    onClick={() => setCreateOpen(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Publish an event
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="rounded-[1.4rem] border border-border/70 bg-card/95 p-4 shadow-sm sm:rounded-[1.75rem] sm:p-5 lg:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-1.5 sm:space-y-2">
              <h2 className="font-serif text-2xl tracking-tight text-foreground sm:text-[2rem]">
                Discover
              </h2>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Search by title or description.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_210px] sm:gap-3 lg:min-w-[520px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-10"
                  placeholder="Search events..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <Select
                value={status}
                onValueChange={(value) => setStatus(value as StatusFilter)}
              >
                <SelectTrigger>
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="all">All statuses</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

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
              <TabsTrigger value="discover">Discover</TabsTrigger>
              {isSignedIn ? <TabsTrigger value="joined">Joined</TabsTrigger> : null}
            </TabsList>

            <TabsContent value="discover" className="mt-4 sm:mt-5">
              <EventGrid
                isLoading={eventsQuery.isLoading}
                error={eventsQuery.error}
                events={visibleEvents}
                isSignedIn={isSignedIn}
                onJoin={handleJoinEvent}
                onLeave={handleLeaveEvent}
                emptyTitle="No events found"
                emptyDescription="Try adjusting your search or filters."
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
                  emptyTitle="No joined events"
                  emptyDescription="Join an event to see it here."
                />
              </TabsContent>
            ) : null}
          </Tabs>
        </section>
      </div>

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
                          <SelectItem value="competition">Competition</SelectItem>
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
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select difficulty" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="beginner">Beginner</SelectItem>
                          <SelectItem value="intermediate">Intermediate</SelectItem>
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
                      <Select value={field.value} onValueChange={field.onChange}>
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
                  {createEventMutation.isPending ? "Publishing..." : "Publish event"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
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
}: {
  isLoading: boolean;
  error: unknown;
  events: Event[];
  isSignedIn: boolean;
  onJoin: (eventId: string) => void;
  onLeave: (eventId: string) => void;
  emptyTitle: string;
  emptyDescription: string;
}) {
  if (isLoading) {
    return (
      <div className="grid gap-4 xl:grid-cols-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-72 rounded-[1.5rem]" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="p-6 text-sm text-destructive">
          {getApiErrorMessage(error, "Failed to load events")}
        </CardContent>
      </Card>
    );
  }

  if (events.length === 0) {
    return (
      <Card className="border-dashed border-border/70 bg-background/70">
        <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
          <CalendarClock className="h-10 w-10 text-muted-foreground" />
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-foreground">{emptyTitle}</h3>
            <p className="max-w-lg text-sm text-muted-foreground">
              {emptyDescription}
            </p>
          </div>
        </CardContent>
      </Card>
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
            {titleCase(event.status)}
          </Badge>
          <Badge variant="outline">
            {titleCase(event.visibility.replace("_", " "))}
          </Badge>
          <Badge variant="outline">{titleCase(event.difficulty)}</Badge>
          <Badge variant="outline">{event.type || "training"}</Badge>
        </div>
        <div className="space-y-2">
          <CardTitle className="font-serif text-2xl tracking-tight text-foreground">
            <Link href={`/events/${event.id}`} className="hover:underline">
              {event.title}
            </Link>
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            {event.description?.trim() || "No description."}
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

function EventStatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <Card className="border-border/60 bg-background/80">
      <CardContent className="flex items-center justify-between gap-2.5 p-3 sm:gap-3 sm:p-4">
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:text-xs sm:tracking-[0.24em]">
            {label}
          </p>
          <p className="text-base font-semibold text-foreground sm:text-lg">{value}</p>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-1.5 text-muted-foreground sm:rounded-2xl sm:p-2">
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

function InfoBox({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/80 p-3 sm:rounded-3xl sm:p-4">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 text-sm leading-5 text-muted-foreground">{description}</p>
    </div>
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

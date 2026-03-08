"use client";

import Link from "next/link";
import { SignInButton } from "@clerk/nextjs";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Compass,
  Lock,
  MapPin,
  MessageSquare,
  Plus,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";

import type { Group } from "@freediving.ph/types";

import { useSession } from "@/features/auth/session";
import {
  useCreateGroup,
  useJoinGroup,
  useLeaveGroup,
} from "@/features/groups/hooks/mutations";
import { useGroups, useUserGroups } from "@/features/groups/hooks/queries";
import { getApiErrorMessage } from "@/lib/http/api-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type VisibilityFilter = "all" | "public" | "private" | "invite_only";

export default function GroupsPage() {
  const session = useSession();
  const isSignedIn = session.status === "signed_in";

  const [activeTab, setActiveTab] = useState<"discover" | "mine">("discover");
  const [search, setSearch] = useState("");
  const [visibility, setVisibility] = useState<VisibilityFilter>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createLocation, setCreateLocation] = useState("");
  const [createVisibility, setCreateVisibility] = useState<
    "public" | "private" | "invite_only"
  >("public");
  const [createJoinPolicy, setCreateJoinPolicy] = useState<
    "open" | "approval" | "invite_only"
  >("open");
  const [pendingGroupIds, setPendingGroupIds] = useState<string[]>([]);

  const filters = useMemo(
    () => ({
      page: 1,
      limit: 24,
      search: search.trim() || undefined,
      visibility: visibility === "all" ? undefined : visibility,
    }),
    [search, visibility],
  );

  const groupsQuery = useGroups(filters);
  const myGroupsQuery = useUserGroups(1, 24, isSignedIn);

  const joinMutation = useJoinGroup();
  const leaveMutation = useLeaveGroup();
  const createMutation = useCreateGroup();

  const discoverGroups = groupsQuery.data?.groups ?? [];
  const myGroups = myGroupsQuery.data?.groups ?? [];
  const joinedGroupIds = new Set(myGroups.map((group) => group.id));

  const onJoin = async (groupId: string) => {
    try {
      const membership = await joinMutation.mutateAsync({ groupId });
      if (membership.status === "invited") {
        setPendingGroupIds((current) =>
          current.includes(groupId) ? current : [...current, groupId],
        );
        toast.success("Join request sent. This group requires approval.");
        return;
      }
      setPendingGroupIds((current) =>
        current.filter((item) => item !== groupId),
      );
      toast.success("Joined group.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to join group"));
    }
  };

  const onLeave = async (groupId: string) => {
    try {
      await leaveMutation.mutateAsync({ groupId });
      setPendingGroupIds((current) =>
        current.filter((item) => item !== groupId),
      );
      toast.success("Left group.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to leave group"));
    }
  };

  const onCreateGroup = async () => {
    if (createName.trim().length < 3) {
      toast.error("Group name must be at least 3 characters.");
      return;
    }
    try {
      const created = await createMutation.mutateAsync({
        name: createName.trim(),
        description: createDescription.trim() || undefined,
        location: createLocation.trim() || undefined,
        visibility: createVisibility,
        joinPolicy: createJoinPolicy,
      });
      setCreateOpen(false);
      setCreateName("");
      setCreateDescription("");
      setCreateLocation("");
      setCreateVisibility("public");
      setCreateJoinPolicy("open");
      toast.success(`Created ${created.name}.`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to create group"));
    }
  };

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.12),_transparent_28%),linear-gradient(180deg,_hsl(var(--background))_0%,_hsl(var(--muted)/0.28)_100%)] px-3 py-4 sm:px-5 sm:py-5 lg:px-8 lg:py-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:gap-5 lg:gap-6">
        <section className="overflow-hidden rounded-[1.4rem] border border-border/70 bg-card/95 shadow-sm sm:rounded-[1.75rem]">
          <div className="grid gap-4 p-4 sm:gap-5 sm:p-5 lg:grid-cols-[1.15fr_0.85fr] lg:gap-6 lg:p-7">
            <div className="space-y-3 sm:space-y-4">
              <Badge className="w-fit rounded-full bg-primary px-2.5 py-0.5 text-[10px] text-primary-foreground sm:px-3 sm:py-1 sm:text-xs">
                Groups
              </Badge>
              <div className="space-y-2 sm:space-y-3">
                <h1 className="max-w-3xl font-serif text-[1.75rem] leading-tight tracking-tight text-foreground sm:text-4xl lg:text-[2.8rem]">
                  Find real freediving communities, not dead shells with a logo
                  and no activity.
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[15px]">
                  Public groups are open for discovery. Private and invite-only
                  groups stay restricted. Signed-in members can join, leave,
                  create groups, and participate where they belong.
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-3 sm:gap-3">
                <StatCard
                  label="Visible groups"
                  value={String(
                    groupsQuery.data?.pagination.total ?? discoverGroups.length,
                  )}
                  icon={<Compass className="h-4 w-4" />}
                />
                <StatCard
                  label={isSignedIn ? "Your groups" : "Public discovery"}
                  value={String(
                    isSignedIn ? myGroups.length : discoverGroups.length,
                  )}
                  icon={<Users className="h-4 w-4" />}
                />
                <StatCard
                  label="Restricted by design"
                  value="Yes"
                  icon={<ShieldCheck className="h-4 w-4" />}
                />
              </div>
            </div>

            <Card className="border-border/70 bg-[linear-gradient(180deg,_hsl(var(--primary)/0.15)_0%,_hsl(var(--card))_100%)]">
              <CardHeader className="space-y-2 p-4 sm:space-y-3 sm:p-6">
                <CardTitle className="text-lg text-foreground sm:text-xl">
                  {isSignedIn ? "What you can do here" : "Guest rules"}
                </CardTitle>
                <CardDescription className="text-sm text-foreground/75">
                  {isSignedIn
                    ? "Browse what is active, keep your own memberships organized, and create a group when you have a real reason for it."
                    : "You can browse public groups. Sign in to join, create a group, or view restricted groups you belong to."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 p-4 pt-0 text-sm text-foreground/80 sm:space-y-4 sm:p-6 sm:pt-0">
                <InfoBox
                  title="Public means discoverable"
                  description="Public groups can be browsed without sign-in. That does not mean every group should be public."
                />
                <InfoBox
                  title="Approval and invite-only are different"
                  description="Approval groups accept requests. Invite-only groups do not. The UI should stop pretending those are the same state."
                />
                {!isSignedIn ? (
                  <SignInButton mode="modal">
                    <Button className="w-full" size="default">
                      Sign in to join and create groups
                    </Button>
                  </SignInButton>
                ) : (
                  <Button
                    className="w-full"
                    size="default"
                    onClick={() => setCreateOpen(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create a group
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
                Discover groups
              </h2>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Search by name or description. Use visibility filters to narrow
                what you want instead of scrolling through junk.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_200px] sm:gap-3 lg:min-w-[520px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-10"
                  placeholder="Search groups by name or description"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <Select
                value={visibility}
                onValueChange={(value) =>
                  setVisibility(value as VisibilityFilter)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Visibility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All visible</SelectItem>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="invite_only">Invite only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={(value) =>
              setActiveTab(value as "discover" | "mine")
            }
            className="mt-4 gap-4 sm:mt-5 sm:gap-5"
          >
            <TabsList
              className={`grid ${isSignedIn ? "w-full max-w-md grid-cols-2" : "w-full max-w-[220px] grid-cols-1"}`}
            >
              <TabsTrigger value="discover">Discover</TabsTrigger>
              {isSignedIn ? (
                <TabsTrigger value="mine">My groups</TabsTrigger>
              ) : null}
            </TabsList>

            <TabsContent value="discover" className="space-y-4">
              {groupsQuery.isLoading ? (
                <CardGridSkeleton count={6} />
              ) : groupsQuery.error ? (
                <ErrorBlock
                  message={getApiErrorMessage(
                    groupsQuery.error,
                    "Failed to load groups",
                  )}
                />
              ) : discoverGroups.length === 0 ? (
                <EmptyState
                  title="No groups matched"
                  description="Broaden the search or stop filtering so hard. If the list is empty, nobody useful is showing up under the current constraints."
                />
              ) : (
                <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                  {discoverGroups.map((group) => (
                    <GroupCard
                      key={group.id}
                      group={group}
                      isSignedIn={isSignedIn}
                      isJoined={joinedGroupIds.has(group.id)}
                      isPending={pendingGroupIds.includes(group.id)}
                      actionPending={
                        joinMutation.isPending || leaveMutation.isPending
                      }
                      onJoin={() => void onJoin(group.id)}
                      onLeave={() => void onLeave(group.id)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {isSignedIn ? (
              <TabsContent value="mine" className="space-y-4">
                {myGroupsQuery.isLoading ? (
                  <CardGridSkeleton count={3} />
                ) : myGroupsQuery.error ? (
                  <ErrorBlock
                    message={getApiErrorMessage(
                      myGroupsQuery.error,
                      "Failed to load your groups",
                    )}
                  />
                ) : myGroups.length === 0 ? (
                  <EmptyState
                    title="You have not joined any groups yet"
                    description="Join a public group, request access to an approval-based group, or create one if you actually intend to run it."
                  />
                ) : (
                  <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                    {myGroups.map((group) => (
                      <GroupCard
                        key={group.id}
                        group={group}
                        isSignedIn
                        isJoined
                        isPending={false}
                        actionPending={leaveMutation.isPending}
                        onJoin={() => undefined}
                        onLeave={() => void onLeave(group.id)}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            ) : null}
          </Tabs>
        </section>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-group-name">Name</Label>
              <Input
                id="create-group-name"
                placeholder="Example: South Luzon Weekend Divers"
                value={createName}
                onChange={(event) => setCreateName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-group-description">Description</Label>
              <Textarea
                id="create-group-description"
                placeholder="What is this group actually for?"
                value={createDescription}
                onChange={(event) => setCreateDescription(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-group-location">Location</Label>
              <Input
                id="create-group-location"
                placeholder="Example: Batangas or Metro Manila"
                value={createLocation}
                onChange={(event) => setCreateLocation(event.target.value)}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Visibility</Label>
                <Select
                  value={createVisibility}
                  onValueChange={(value) =>
                    setCreateVisibility(
                      value as "public" | "private" | "invite_only",
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="invite_only">Invite only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Join policy</Label>
                <Select
                  value={createJoinPolicy}
                  onValueChange={(value) =>
                    setCreateJoinPolicy(
                      value as "open" | "approval" | "invite_only",
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open join</SelectItem>
                    <SelectItem value="approval">Approval required</SelectItem>
                    <SelectItem value="invite_only">Invite only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => void onCreateGroup()}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Creating..." : "Create group"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GroupCard({
  group,
  isSignedIn,
  isJoined,
  isPending,
  actionPending,
  onJoin,
  onLeave,
}: {
  group: Group;
  isSignedIn: boolean;
  isJoined: boolean;
  isPending: boolean;
  actionPending: boolean;
  onJoin: () => void;
  onLeave: () => void;
}) {
  const joinLabel = group.joinPolicy === "approval" ? "Request access" : "Join";
  const canJoin =
    group.visibility !== "invite_only" && group.joinPolicy !== "invite_only";

  return (
    <Card className="overflow-hidden rounded-[1.75rem] border-border/70 bg-background/80">
      <CardHeader className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <CardTitle className="text-xl">
              <Link
                href={`/groups/${group.id}`}
                className="transition-colors hover:text-primary"
              >
                {group.name}
              </Link>
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <Badge
                variant={
                  group.visibility === "public" ? "secondary" : "outline"
                }
              >
                {visibilityLabel(group.visibility)}
              </Badge>
              <Badge variant="outline">
                {joinPolicyLabel(group.joinPolicy)}
              </Badge>
            </div>
          </div>
          {group.visibility !== "public" ? (
            <Lock className="mt-1 h-4 w-4 text-muted-foreground" />
          ) : null}
        </div>
        <CardDescription className="line-clamp-3 min-h-[3.75rem] text-sm text-muted-foreground">
          {group.description ||
            "No description yet. That is usually a bad sign, but at least the group exists."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            {group.memberCount} members
          </div>
          <div className="flex items-center gap-1">
            <MessageSquare className="h-4 w-4" />
            {group.postCount} posts
          </div>
          {group.location ? (
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {group.location}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href={`/groups/${group.id}`}>
            <Button variant="outline" size="sm">
              Open group
            </Button>
          </Link>
          {!isSignedIn ? (
            <SignInButton mode="modal">
              <Button size="sm">{canJoin ? joinLabel : "Sign in"}</Button>
            </SignInButton>
          ) : isJoined ? (
            <Button
              variant="outline"
              size="sm"
              disabled={actionPending}
              onClick={onLeave}
            >
              Leave
            </Button>
          ) : isPending ? (
            <Badge className="rounded-full bg-primary/10 px-3 py-1 text-primary">
              Request pending
            </Badge>
          ) : canJoin ? (
            <Button size="sm" disabled={actionPending} onClick={onJoin}>
              {joinLabel}
            </Button>
          ) : (
            <Badge variant="outline" className="rounded-full px-3 py-1">
              Invite only
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StatCard({
  label,
  value,
  icon,
}: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/80 p-3 sm:rounded-3xl sm:p-4">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-2xl font-semibold text-foreground sm:mt-3 sm:text-3xl">{value}</p>
    </div>
  );
}

function InfoBox({
  title,
  description,
}: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/80 p-3 sm:rounded-3xl sm:p-4">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 text-sm leading-5 text-foreground/80">{description}</p>
    </div>
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

function CardGridSkeleton({ count }: { count: number }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} className="h-64 w-full rounded-[1.75rem]" />
      ))}
    </div>
  );
}

function visibilityLabel(value: Group["visibility"]) {
  switch (value) {
    case "invite_only":
      return "Invite only";
    case "private":
      return "Private";
    default:
      return "Public";
  }
}

function joinPolicyLabel(value: Group["joinPolicy"]) {
  switch (value) {
    case "approval":
      return "Approval required";
    case "invite_only":
      return "Invite only";
    default:
      return "Open join";
  }
}

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
  CommunityAccessNote,
  CommunityBrowseToolbar,
  CommunityEmptyState,
  CommunityHeader,
  CommunityPageShell,
  CommunityStats,
} from "@/components/community/community-page";
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

type VisibilityFilter = "all" | "public" | "invite_only";

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
    "open" | "invite_only"
  >("open");

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
        toast.error(
          "This group is invite-only right now. Ask an organizer for access.",
        );
        return;
      }
      toast.success("Joined group.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to join group"));
    }
  };

  const onLeave = async (groupId: string) => {
    try {
      await leaveMutation.mutateAsync({ groupId });
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
    <CommunityPageShell>
      <CommunityHeader
        eyebrow="Groups"
        title="Join local freediving crews"
        subtitle="Find clubs, training squads, and island communities planning dives near you."
        action={
          !isSignedIn ? (
            <SignInButton mode="modal">
              <Button size="lg">Sign in to create</Button>
            </SignInButton>
          ) : (
            <Button size="lg" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create group
            </Button>
          )
        }
      />

      <CommunityStats
        items={[
          {
            label: "Groups",
            value: String(
              groupsQuery.data?.pagination.total ?? discoverGroups.length,
            ),
            icon: <Compass className="h-4 w-4" />,
          },
          {
            label: "Your groups",
            value: String(isSignedIn ? myGroups.length : 0),
            icon: <Users className="h-4 w-4" />,
          },
          {
            label: "Invite-only",
            value: "Supported",
            icon: <ShieldCheck className="h-4 w-4" />,
          },
        ]}
      />

      <CommunityAccessNote>
        Public groups are discoverable. Restricted groups require approval or an
        invite.
      </CommunityAccessNote>

      <section className="space-y-5">
        <CommunityBrowseToolbar
          label={
            <>
              <Search className="h-4 w-4" />
              Browse groups
            </>
          }
          title="Find a crew"
          description="Search by group name, club, or local area."
        >
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_200px] sm:gap-3 lg:min-w-[520px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-10"
                placeholder="Search groups or areas"
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
                <SelectItem value="all">All groups</SelectItem>
                <SelectItem value="public">Public groups</SelectItem>
                <SelectItem value="invite_only">Invite-only groups</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CommunityBrowseToolbar>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as "discover" | "mine")}
          className="mt-4 gap-4 sm:mt-5 sm:gap-5"
        >
          <TabsList
            className={`grid ${isSignedIn ? "w-full max-w-md grid-cols-2" : "w-full max-w-[220px] grid-cols-1"}`}
          >
            <TabsTrigger value="discover">All groups</TabsTrigger>
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
                  "Groups are taking longer than expected. Try again in a moment.",
                )}
              />
            ) : discoverGroups.length === 0 ? (
              <CommunityEmptyState
                title="No groups found"
                description="Try another area, clear the filters, or create the first group for your crew."
                action={
                  !isSignedIn ? null : (
                    <Button size="sm" onClick={() => setCreateOpen(true)}>
                      Create group
                    </Button>
                  )
                }
              />
            ) : (
              <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                {discoverGroups.map((group) => (
                  <GroupCard
                    key={group.id}
                    group={group}
                    isSignedIn={isSignedIn}
                    isJoined={joinedGroupIds.has(group.id)}
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
                    "Your groups are taking longer than expected. Try again in a moment.",
                  )}
                />
              ) : myGroups.length === 0 ? (
                <CommunityEmptyState
                  title="No groups joined yet"
                  description="Join a local crew when you find one that fits, or create the first group for your own divers."
                  action={
                    <Button size="sm" onClick={() => setCreateOpen(true)}>
                      Create group
                    </Button>
                  }
                />
              ) : (
                <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                  {myGroups.map((group) => (
                    <GroupCard
                      key={group.id}
                      group={group}
                      isSignedIn
                      isJoined
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
                placeholder="What is this group for?"
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
                    setCreateJoinPolicy(value as "open" | "invite_only")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open join</SelectItem>
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
    </CommunityPageShell>
  );
}

function GroupCard({
  group,
  isSignedIn,
  isJoined,
  actionPending,
  onJoin,
  onLeave,
}: {
  group: Group;
  isSignedIn: boolean;
  isJoined: boolean;
  actionPending: boolean;
  onJoin: () => void;
  onLeave: () => void;
}) {
  const canJoin =
    group.visibility !== "invite_only" && group.joinPolicy === "open";
  const isApprovalOnly = group.joinPolicy === "approval";

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
          {group.description || "This group has not added a description yet."}
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
              <Button size="sm">{canJoin ? "Join" : "Sign in"}</Button>
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
          ) : canJoin ? (
            <Button size="sm" disabled={actionPending} onClick={onJoin}>
              Join
            </Button>
          ) : isApprovalOnly ? (
            <Badge variant="outline" className="rounded-full px-3 py-1">
              Ask organizer to join
            </Badge>
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

function ErrorBlock({ message }: { message: string }) {
  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardContent className="p-4 text-sm text-destructive">
        {message}
      </CardContent>
    </Card>
  );
}

function CardGridSkeleton({ count }: { count: number }) {
  return (
    <div className="space-y-4">
      <Card className="border-border/70 bg-muted/30">
        <CardContent className="p-5">
          <p className="font-medium text-foreground">
            Looking for community groups
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            We are checking public groups, clubs, and local dive crews you can
            browse.
          </p>
        </CardContent>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: count }).map((_, index) => (
          <Skeleton key={index} className="h-64 w-full rounded-[1.75rem]" />
        ))}
      </div>
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
      return "Restricted";
    case "invite_only":
      return "Invite only";
    default:
      return "Open join";
  }
}

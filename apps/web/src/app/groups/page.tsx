"use client";

import Link from "next/link";
import { SignInButton } from "@clerk/nextjs";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Check,
  Compass,
  Lock,
  MapPin,
  MessageSquare,
  Plus,
  Search,
  ShieldCheck,
  Users,
  X,
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
  useAcceptGroupInvite,
  useCreateGroup,
  useRejectGroupInvite,
  useJoinGroup,
  useLeaveGroup,
} from "@/features/groups/hooks/mutations";
import { useGroups, useUserGroups } from "@/features/groups/hooks/queries";
import { LocationSearch } from "@/features/locations/components";
import {
  buildDisplayLocation,
  EMPTY_LOCATION_SEARCH_VALUE,
  type LocationSearchValue,
} from "@/features/locations/types";
import { getApiErrorMessage } from "@/lib/http/api-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

type VisibilityFilter = "all" | "public" | "private";

export default function GroupsPage() {
  const session = useSession();
  const isSignedIn = session.status === "signed_in";

  const [activeTab, setActiveTab] = useState<"discover" | "mine">("discover");
  const [search, setSearch] = useState("");
  const [visibility, setVisibility] = useState<VisibilityFilter>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createLocation, setCreateLocation] = useState<LocationSearchValue>(
    EMPTY_LOCATION_SEARCH_VALUE,
  );
  const [createVisibility, setCreateVisibility] = useState<
    "public" | "private"
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
  const acceptInviteMutation = useAcceptGroupInvite();
  const rejectInviteMutation = useRejectGroupInvite();

  const discoverGroups = groupsQuery.data?.groups ?? [];
  const myGroups = myGroupsQuery.data?.groups ?? [];
  const joinedGroupIds = new Set(myGroups.map((group) => group.id));
  const isPrivateCreate = createVisibility === "private";

  useEffect(() => {
    if (isPrivateCreate && createJoinPolicy !== "invite_only") {
      setCreateJoinPolicy("invite_only");
    }
  }, [createJoinPolicy, isPrivateCreate]);

  const onJoin = async (groupId: string) => {
    try {
      await joinMutation.mutateAsync({ groupId });
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

  const onAcceptInvite = async (groupId: string) => {
    try {
      await acceptInviteMutation.mutateAsync({ groupId });
      toast.success("Joined group.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to accept invite"));
    }
  };

  const onRejectInvite = async (groupId: string) => {
    try {
      await rejectInviteMutation.mutateAsync({ groupId });
      toast.success("Invite declined.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to reject invite"));
    }
  };

  const onCreateGroup = async () => {
    if (createName.trim().length < 3) {
      toast.error("Group name must be at least 3 characters.");
      return;
    }
    const structuredLocation = buildDisplayLocation(createLocation);
    const location =
      structuredLocation ||
      createLocation.formattedAddress?.trim() ||
      createLocation.locationName?.trim() ||
      undefined;
    try {
      const created = await createMutation.mutateAsync({
        name: createName.trim(),
        description: createDescription.trim() || undefined,
        location,
        locationName: createLocation.locationName?.trim() || undefined,
        formattedAddress: createLocation.formattedAddress?.trim() || undefined,
        regionCode: createLocation.regionCode?.trim() || undefined,
        provinceCode: createLocation.provinceCode?.trim() || undefined,
        cityCode: createLocation.cityCode?.trim() || undefined,
        barangayCode: createLocation.barangayCode?.trim() || undefined,
        locationSource: createLocation.locationSource || undefined,
        visibility: createVisibility,
        joinPolicy: isPrivateCreate ? "invite_only" : createJoinPolicy,
      });
      setCreateOpen(false);
      setCreateName("");
      setCreateDescription("");
      setCreateLocation(EMPTY_LOCATION_SEARCH_VALUE);
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
        eyebrow="Community"
        title="Groups"
        subtitle="Find clubs, training squads, and local communities planning dives near you."
        action={
          !isSignedIn ? (
            <SignInButton mode="modal">
              <Button size="sm">Sign in to create</Button>
            </SignInButton>
          ) : (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
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
            icon: <Compass className="h-3.5 w-3.5" />,
          },
          {
            label: "Your groups",
            value: String(isSignedIn ? myGroups.length : 0),
            icon: <Users className="h-3.5 w-3.5" />,
          },
          {
            label: "Access",
            value: "Public/private",
            icon: <ShieldCheck className="h-3.5 w-3.5" />,
          },
        ]}
      />

      <CommunityAccessNote>
        Public groups are discoverable. Private groups stay hidden unless you
        are already a member or have a pending invite.
      </CommunityAccessNote>

      <section className="space-y-3">
        <CommunityBrowseToolbar
          label={
            <>
              <Search className="h-3.5 w-3.5" />
              Browse
            </>
          }
          title="Browse groups"
          description="Search by group name, club, or local area."
        >
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px]">
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
              items={[
                { value: "all", label: "All groups" },
                { value: "public", label: "Public groups" },
                { value: "private", label: "Private groups" },
              ]}
            >
              <SelectTrigger>
                <SelectValue placeholder="Visibility" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All groups</SelectItem>
                <SelectItem value="public">Public groups</SelectItem>
                <SelectItem value="private">Private groups</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CommunityBrowseToolbar>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as "discover" | "mine")}
          className="gap-3"
        >
          {isSignedIn ? (
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="discover">All groups</TabsTrigger>
              <TabsTrigger value="mine">My groups</TabsTrigger>
            </TabsList>
          ) : null}

          <TabsContent value="discover" className="space-y-3">
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
              <div className="grid gap-3 lg:grid-cols-2">
                {discoverGroups.map((group) => (
                  <GroupCard
                    key={group.id}
                    group={group}
                    isSignedIn={isSignedIn}
                    isJoined={joinedGroupIds.has(group.id)}
                    actionPending={
                      joinMutation.isPending ||
                      leaveMutation.isPending ||
                      acceptInviteMutation.isPending ||
                      rejectInviteMutation.isPending
                    }
                    onJoin={() => void onJoin(group.id)}
                    onLeave={() => void onLeave(group.id)}
                    onAcceptInvite={() => void onAcceptInvite(group.id)}
                    onRejectInvite={() => void onRejectInvite(group.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {isSignedIn ? (
            <TabsContent value="mine" className="space-y-3">
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
                <div className="grid gap-3 lg:grid-cols-2">
                  {myGroups.map((group) => (
                    <GroupCard
                      key={group.id}
                      group={group}
                      isSignedIn
                      isJoined
                      actionPending={leaveMutation.isPending}
                      onJoin={() => undefined}
                      onLeave={() => void onLeave(group.id)}
                      onAcceptInvite={() => undefined}
                      onRejectInvite={() => undefined}
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
              <LocationSearch
                value={createLocation}
                onChange={setCreateLocation}
                disabled={createMutation.isPending}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Visibility</Label>
                <Select
                  value={createVisibility}
                  onValueChange={(value) => {
                    const nextVisibility = value as "public" | "private";
                    setCreateVisibility(nextVisibility);
                    if (nextVisibility === "private") {
                      setCreateJoinPolicy("invite_only");
                    }
                  }}
                  items={[
                    { value: "public", label: "Public" },
                    { value: "private", label: "Private" },
                  ]}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
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
                  items={[
                    ...(isPrivateCreate
                      ? []
                      : [{ value: "open", label: "Open join" }]),
                    { value: "invite_only", label: "Invite only" },
                  ]}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {isPrivateCreate ? null : (
                      <SelectItem value="open">Open join</SelectItem>
                    )}
                    <SelectItem value="invite_only">Invite only</SelectItem>
                  </SelectContent>
                </Select>
                {isPrivateCreate ? (
                  <p className="text-xs text-muted-foreground">
                    Private groups are invite-only.
                  </p>
                ) : null}
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
  onAcceptInvite,
  onRejectInvite,
}: {
  group: Group;
  isSignedIn: boolean;
  isJoined: boolean;
  actionPending: boolean;
  onJoin: () => void;
  onLeave: () => void;
  onAcceptInvite: () => void;
  onRejectInvite: () => void;
}) {
  const membershipStatus =
    group.viewerMembershipStatus ?? (isJoined ? "active" : undefined);
  const isActiveMember = membershipStatus === "active";
  const hasPendingInvite = membershipStatus === "invited";
  const canJoin = group.visibility === "public" && group.joinPolicy === "open";
  const locationLabel = groupLocationLabel(group);

  return (
    <Card className="rounded-xl border-border/70 bg-background/80 py-0 shadow-none">
      <CardContent className="space-y-3 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <Link
              href={`/groups/${group.id}`}
              className="block truncate text-sm font-semibold text-foreground transition-colors hover:text-primary"
            >
              {group.name}
            </Link>
            <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
              {group.description ||
                "This group has not added a description yet."}
            </p>
          </div>
          {group.visibility !== "public" ? (
            <Lock className="mt-1 h-4 w-4 text-muted-foreground" />
          ) : null}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Badge
            variant={group.visibility === "public" ? "secondary" : "outline"}
            className="h-5 px-2 text-[11px]"
          >
            {visibilityLabel(group.visibility)}
          </Badge>
          <Badge variant="outline" className="h-5 px-2 text-[11px]">
            {joinPolicyLabel(group.joinPolicy)}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            {group.memberCount} members
          </div>
          <div className="flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" />
            {group.postCount} posts
          </div>
          {locationLabel ? (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              {locationLabel}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href={`/groups/${group.id}`}>
            <Button variant="outline" size="xs">
              Open group
            </Button>
          </Link>
          {!isSignedIn ? (
            <SignInButton mode="modal">
              <Button size="xs">{canJoin ? "Join" : "Sign in"}</Button>
            </SignInButton>
          ) : isActiveMember ? (
            <Button
              variant="outline"
              size="xs"
              disabled={actionPending}
              onClick={onLeave}
            >
              Leave
            </Button>
          ) : hasPendingInvite ? (
            <>
              <Button
                size="xs"
                disabled={actionPending}
                onClick={onAcceptInvite}
              >
                <Check className="mr-1 h-3 w-3" />
                Accept
              </Button>
              <Button
                variant="outline"
                size="xs"
                disabled={actionPending}
                onClick={onRejectInvite}
              >
                <X className="mr-1 h-3 w-3" />
                Reject
              </Button>
            </>
          ) : canJoin ? (
            <Button size="xs" disabled={actionPending} onClick={onJoin}>
              Join
            </Button>
          ) : (
            <Badge
              variant="outline"
              className="h-6 rounded-full px-2 text-[11px]"
            >
              Invite required
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ErrorBlock({ message }: { message: string }) {
  return (
    <Card className="border-destructive/30 bg-destructive/5 py-0">
      <CardContent className="p-3 text-xs text-destructive">
        {message}
      </CardContent>
    </Card>
  );
}

function CardGridSkeleton({ count }: { count: number }) {
  return (
    <div className="space-y-3">
      <Card className="border-border/70 bg-muted/30 py-0">
        <CardContent className="p-3">
          <p className="text-sm font-medium text-foreground">
            Looking for community groups
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            We are checking public groups, clubs, and local dive crews you can
            browse.
          </p>
        </CardContent>
      </Card>
      <div className="grid gap-3 lg:grid-cols-2">
        {Array.from({ length: count }).map((_, index) => (
          <Skeleton key={index} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

function visibilityLabel(value: Group["visibility"]) {
  switch (value) {
    case "private":
      return "Private";
    default:
      return "Public";
  }
}

function joinPolicyLabel(value: Group["joinPolicy"]) {
  switch (value) {
    case "invite_only":
      return "Invite only";
    default:
      return "Open join";
  }
}

function groupLocationLabel(group: Group) {
  return (
    group.location ||
    buildDisplayLocation({
      locationName: group.locationName,
      formattedAddress: group.formattedAddress,
      regionCode: group.regionCode,
      provinceCode: group.provinceCode,
      cityCode: group.cityCode,
      barangayCode: group.barangayCode,
      locationSource: group.locationSource,
    })
  );
}

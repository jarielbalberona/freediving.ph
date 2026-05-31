"use client";

import { SignInButton } from "@clerk/nextjs";
import {
  ArrowLeft,
  Check,
  Lock,
  LogOut,
  MapPin,
  MessageSquare,
  PenSquare,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { type ReactNode, useState } from "react";
import { toast } from "sonner";

import type {
  Group,
  GroupMember,
  GroupPost,
  Profile,
} from "@freediving.ph/types";

import { EntityAvatar, EntityCover } from "@/components/common/entity-media";
import { UserIdentityHeader } from "@/components/common/UserIdentityHeader";
import {
  CommunityEmptyState,
  CommunityPageShell,
} from "@/components/community/community-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSession } from "@/features/auth/session";
import { ChikaMarkdown } from "@/features/chika/components/ChikaMarkdown";
import { MarkdownEditor } from "@/features/chika/components/MarkdownEditor";
import {
  useAcceptGroupInvite,
  useCreateGroupPost,
  useInviteGroupMember,
  useJoinGroup,
  useLeaveGroup,
  useRejectGroupInvite,
} from "@/features/groups/hooks/mutations";
import {
  useGroup,
  useGroupMembers,
  useGroupPosts,
} from "@/features/groups/hooks/queries";
import { buildDisplayLocation } from "@/features/locations/types";
import { useUserSearch } from "@/features/profiles/hooks/queries";
import { getApiErrorMessage, getApiErrorStatus } from "@/lib/http/api-error";

export default function GroupDetailClient({ slug }: { slug: string }) {
  const session = useSession();
  const isSignedIn = session.status === "signed_in";
  const viewerScope = isSignedIn ? "signed_in" : "public";

  const [activeTab, setActiveTab] = useState<"home" | "members">("home");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [postOpen, setPostOpen] = useState(false);
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [inviteSearch, setInviteSearch] = useState("");

  const groupQuery = useGroup(slug, viewerScope, session.status !== "loading");
  const groupId = groupQuery.data?.id ?? "";
  const canLoadGroupResources = !!groupQuery.data;
  const membersQuery = useGroupMembers(
    groupId,
    1,
    20,
    canLoadGroupResources,
    viewerScope,
  );
  const postsQuery = useGroupPosts(
    groupId,
    1,
    20,
    canLoadGroupResources,
    viewerScope,
  );
  const userSearchQuery = useUserSearch(inviteSearch, 8);

  const joinMutation = useJoinGroup();
  const leaveMutation = useLeaveGroup();
  const inviteMutation = useInviteGroupMember();
  const acceptInviteMutation = useAcceptGroupInvite();
  const rejectInviteMutation = useRejectGroupInvite();
  const createPostMutation = useCreateGroupPost();

  const group = groupQuery.data;
  const members = membersQuery.data?.members ?? [];
  const posts = postsQuery.data?.posts ?? [];
  const membershipStatus = group?.viewerMembershipStatus;
  const isMember = membershipStatus === "active";
  const hasPendingInvite = membershipStatus === "invited";
  const activeMemberIds = new Set(
    members
      .filter((member) => member.status === "active")
      .map((member) => member.userId),
  );
  const inviteResults = (userSearchQuery.data ?? []).filter(
    (profile) =>
      profile.userId !== session.me?.userId &&
      !activeMemberIds.has(profile.userId),
  );

  const onJoin = async () => {
    if (!groupId) return;
    try {
      await joinMutation.mutateAsync({ groupId });
      toast.success("Joined group.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to join group"));
    }
  };

  const onAcceptInvite = async () => {
    if (!groupId) return;
    try {
      await acceptInviteMutation.mutateAsync({ groupId });
      toast.success("Joined group.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to accept invite"));
    }
  };

  const onRejectInvite = async () => {
    if (!groupId) return;
    try {
      await rejectInviteMutation.mutateAsync({ groupId });
      toast.success("Invite declined.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to reject invite"));
    }
  };

  const onInviteMember = async (profile: Profile) => {
    if (!groupId) return;
    try {
      await inviteMutation.mutateAsync({ groupId, userId: profile.userId });
      setInviteSearch("");
      toast.success(`Invited ${profile.displayName || profile.username}.`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to invite member"));
    }
  };

  const onLeave = async () => {
    if (!groupId) return;
    try {
      await leaveMutation.mutateAsync({ groupId });
      toast.success("Left group.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to leave group"));
    }
  };

  const onCreatePost = async () => {
    if (!groupId) return;
    if (!postContent.trim()) {
      toast.error("Post content is required.");
      return;
    }
    try {
      await createPostMutation.mutateAsync({
        groupId,
        title: postTitle.trim() || undefined,
        content: postContent.trim(),
      });
      setPostTitle("");
      setPostContent("");
      setPostOpen(false);
      toast.success("Group post published.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to publish group post"));
    }
  };

  if (groupQuery.isLoading) {
    return (
      <CommunityPageShell>
        <BackToGroupsButton />
        <div className="space-y-3">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </CommunityPageShell>
    );
  }

  if (groupQuery.error && getApiErrorStatus(groupQuery.error) === 403) {
    return <GroupAccessDeniedPage />;
  }

  if (groupQuery.error || !group) {
    return (
      <CommunityPageShell>
        <BackToGroupsButton />
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {getApiErrorMessage(
            groupQuery.error,
            "This group is taking longer than expected to open. Try again in a moment.",
          )}
        </div>
      </CommunityPageShell>
    );
  }

  const canJoin = group.visibility === "public" && group.joinPolicy === "open";
  const locationLabel = groupLocationLabel(group);
  const canManageGroup =
    group.viewerRole === "owner" || group.viewerRole === "moderator";
  const actionPending =
    joinMutation.isPending ||
    leaveMutation.isPending ||
    acceptInviteMutation.isPending ||
    rejectInviteMutation.isPending;

  return (
    <CommunityPageShell>
      <BackToGroupsButton />

      <header className="space-y-3">
        <div className="relative">
          <EntityCover
            src={group.coverUrl}
            label={group.name}
            className="aspect-[16/7]"
            fallback="Group cover photo coming soon."
          />
          <EntityAvatar
            src={group.logoUrl}
            label={group.name}
            icon={Users}
            className="absolute bottom-2 left-2 h-14 w-14 rounded-xl bg-background/90 backdrop-blur"
          />
        </div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1.5">
            <h1 className="text-lg font-semibold tracking-tight text-foreground">
              {group.name}
            </h1>
            <p className="max-w-xl text-xs leading-5 text-muted-foreground">
              {group.bio || "This group has not added a bio yet."}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {canManageGroup ? (
              <Button
                size="sm"
                variant="outline"
                nativeButton={false}
                render={
                  <Link
                    href={`/management/groups/${encodeURIComponent(group.slug)}`}
                  />
                }
              >
                Manage
              </Button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge className="h-5 px-2 text-[11px]">
              {visibilityLabel(group.visibility)}
            </Badge>
            <Badge variant="outline" className="h-5 px-2 text-[11px]">
              {joinPolicyLabel(group.joinPolicy)}
            </Badge>
            {group.visibility !== "public" ? (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Lock className="h-3 w-3" />
                Restricted
              </span>
            ) : null}
          </div>

          <GroupActions
            actionPending={actionPending}
            canJoin={canJoin}
            canInvite={isSignedIn && isMember}
            hasPendingInvite={hasPendingInvite}
            isMember={isMember}
            isSignedIn={isSignedIn}
            onAcceptInvite={() => void onAcceptInvite()}
            onInvite={() => setInviteOpen(true)}
            onJoin={() => void onJoin()}
            onLeave={() => void onLeave()}
            onRejectInvite={() => void onRejectInvite()}
          />
        </div>

        <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {group.memberCount} members
          </span>
          <span className="inline-flex items-center gap-1">
            <MessageSquare className="h-3.5 w-3.5" />
            {group.postCount} posts
          </span>
          {locationLabel ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {locationLabel}
            </span>
          ) : null}
        </div>

        {group.description ? (
          <div className="border-t border-border/70 pt-3">
            <ChikaMarkdown
              content={group.description}
              className="space-y-2 text-xs leading-5 text-muted-foreground"
            />
          </div>
        ) : null}
      </header>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as "home" | "members")}
        className="gap-3"
      >
        <TabsList className="grid w-full max-w-sm grid-cols-2">
          <TabsTrigger value="home">Home</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
        </TabsList>

        <TabsContent value="home" className="space-y-4">
          <DetailSection
            title="Recent posts"
            description="Latest group activity."
            action={
              isSignedIn && isMember ? (
                <Button size="sm" onClick={() => setPostOpen(true)}>
                  <PenSquare className="mr-1 h-4 w-4" />
                  Post to group
                </Button>
              ) : null
            }
          >
            {postsQuery.isLoading ? (
              <Skeleton className="h-24 w-full rounded-xl" />
            ) : postsQuery.error ? (
              <p className="text-sm text-destructive">
                {getApiErrorMessage(
                  postsQuery.error,
                  "Group posts are taking longer than expected to appear.",
                )}
              </p>
            ) : posts.length === 0 ? (
              <CommunityEmptyState
                title="No posts yet"
                description="Recent group posts will appear here when members start sharing plans or updates."
              />
            ) : (
              <div className="divide-y divide-border/70 border-y border-border/70">
                {posts.map((post) => (
                  <PostItem key={post.id} post={post} />
                ))}
              </div>
            )}
          </DetailSection>
        </TabsContent>

        <TabsContent value="members" className="space-y-4">
          <DetailSection
            title="Members"
            description="Current member list for this group."
          >
            {membersQuery.isLoading ? (
              <Skeleton className="h-24 w-full rounded-xl" />
            ) : membersQuery.error ? (
              <p className="text-sm text-destructive">
                {getApiErrorMessage(
                  membersQuery.error,
                  "Members are taking longer than expected to appear.",
                )}
              </p>
            ) : members.length === 0 ? (
              <CommunityEmptyState
                title="No members yet"
                description="Members will appear here once the group starts growing."
              />
            ) : (
              <MemberList members={members} />
            )}
          </DetailSection>
        </TabsContent>
      </Tabs>

      <InviteMemberDialog
        inviteMutationPending={inviteMutation.isPending}
        inviteOpen={inviteOpen}
        inviteResults={inviteResults}
        inviteSearch={inviteSearch}
        isLoading={userSearchQuery.isLoading}
        onInvite={onInviteMember}
        onOpenChange={(open) => {
          setInviteOpen(open);
          if (!open) setInviteSearch("");
        }}
        onSearchChange={setInviteSearch}
      />

      <Dialog open={postOpen} onOpenChange={setPostOpen}>
        <DialogContent className="gap-4 sm:max-w-2xl!">
          <DialogHeader>
            <DialogTitle>Post to the group</DialogTitle>
            <DialogDescription>
              Share a plan, update, or question with group members.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="group-post-title">Title</Label>
              <Input
                id="group-post-title"
                placeholder="Optional short title"
                value={postTitle}
                onChange={(event) => setPostTitle(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Content</Label>
              <MarkdownEditor
                value={postContent}
                onChange={setPostContent}
                maxLength={10000}
                minRows={5}
                placeholder="Write something..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPostOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={createPostMutation.isPending}
              onClick={() => void onCreatePost()}
            >
              {createPostMutation.isPending ? "Publishing..." : "Publish post"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CommunityPageShell>
  );
}

function GroupAccessDeniedPage() {
  return (
    <CommunityPageShell>
      <BackToGroupsButton />
      <section className="max-w-2xl space-y-4 rounded-xl border border-border bg-card px-5 py-6 text-sm shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-muted">
            <Lock className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="min-w-0 space-y-1.5">
            <h1 className="text-base font-semibold text-foreground">
              Access not allowed
            </h1>
            <p className="max-w-xl text-sm leading-6 text-muted-foreground">
              This is a private group. You need an invite or active membership
              to view its details, members, and posts.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" render={<Link href="/groups" />}>
            Browse groups
          </Button>
          <Button size="sm" variant="outline" render={<Link href="/" />}>
            Home
          </Button>
        </div>
      </section>
    </CommunityPageShell>
  );
}

function GroupActions({
  actionPending,
  canInvite,
  canJoin,
  hasPendingInvite,
  isMember,
  isSignedIn,
  onAcceptInvite,
  onInvite,
  onJoin,
  onLeave,
  onRejectInvite,
}: {
  actionPending: boolean;
  canInvite: boolean;
  canJoin: boolean;
  hasPendingInvite: boolean;
  isMember: boolean;
  isSignedIn: boolean;
  onAcceptInvite: () => void;
  onInvite: () => void;
  onJoin: () => void;
  onLeave: () => void;
  onRejectInvite: () => void;
}) {
  if (!isSignedIn) {
    return (
      <SignInButton mode="modal">
        <Button size="sm">{canJoin ? "Sign in to join" : "Sign in"}</Button>
      </SignInButton>
    );
  }

  if (isMember) {
    return (
      <div className="flex flex-wrap gap-2 sm:justify-end">
        {canInvite ? (
          <Button size="sm" variant="outline" onClick={onInvite}>
            <UserPlus className="mr-1 h-4 w-4" />
            Invite member
          </Button>
        ) : null}
        <Button
          size="sm"
          variant="outline"
          disabled={actionPending}
          onClick={onLeave}
        >
          <LogOut className="mr-1 h-4 w-4" />
          Leave group
        </Button>
      </div>
    );
  }

  if (hasPendingInvite) {
    return (
      <div className="flex flex-wrap gap-2 sm:justify-end">
        <Button size="sm" disabled={actionPending} onClick={onAcceptInvite}>
          <Check className="mr-1 h-4 w-4" />
          Accept invite
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={actionPending}
          onClick={onRejectInvite}
        >
          <X className="mr-1 h-4 w-4" />
          Reject
        </Button>
      </div>
    );
  }

  if (canJoin) {
    return (
      <Button size="sm" disabled={actionPending} onClick={onJoin}>
        Join group
      </Button>
    );
  }

  return <p className="text-xs text-muted-foreground">Invite required.</p>;
}

function InviteMemberDialog({
  inviteMutationPending,
  inviteOpen,
  inviteResults,
  inviteSearch,
  isLoading,
  onInvite,
  onOpenChange,
  onSearchChange,
}: {
  inviteMutationPending: boolean;
  inviteOpen: boolean;
  inviteResults: Profile[];
  inviteSearch: string;
  isLoading: boolean;
  onInvite: (profile: Profile) => Promise<void>;
  onOpenChange: (open: boolean) => void;
  onSearchChange: (value: string) => void;
}) {
  return (
    <Dialog open={inviteOpen} onOpenChange={onOpenChange}>
      <DialogContent className="gap-4 sm:max-w-lg!">
        <DialogHeader>
          <DialogTitle>Invite member</DialogTitle>
          <DialogDescription>
            Search by display name or username, then invite the diver to this
            group.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            placeholder="Search people by name or username"
            value={inviteSearch}
            onChange={(event) => onSearchChange(event.target.value)}
          />
          {inviteSearch.trim().length > 0 ? (
            isLoading ? (
              <Skeleton className="h-12 w-full rounded-lg" />
            ) : inviteResults.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No available users found.
              </p>
            ) : (
              <div className="divide-y divide-border/70 border-y border-border/70">
                {inviteResults.map((profile) => (
                  <div
                    key={profile.userId}
                    className="flex items-center justify-between gap-3 py-2"
                  >
                    <UserIdentityHeader
                      displayName={
                        profile.displayName ||
                        profile.username ||
                        profile.userId
                      }
                      username={profile.username}
                      avatarUrl={profile.avatarUrl}
                      usernameFallback="user"
                    />
                    <Button
                      size="xs"
                      disabled={inviteMutationPending}
                      onClick={() => void onInvite(profile)}
                    >
                      Invite
                    </Button>
                  </div>
                ))}
              </div>
            )
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BackToGroupsButton() {
  return (
    <div>
      <Button size="sm" variant="outline" render={<Link href="/groups" />}>
        <ArrowLeft className="mr-1 h-4 w-4" />
        Groups
      </Button>
    </div>
  );
}

function MemberList({ members }: { members: GroupMember[] }) {
  return (
    <div className="divide-y divide-border/70 border-y border-border/70">
      {members.map((member) => (
        <div
          key={member.userId}
          className="flex items-center justify-between gap-3 py-3"
        >
          <UserIdentityHeader
            displayName={member.displayName || member.username || member.userId}
            username={member.username}
            avatarUrl={member.avatarUrl}
            usernameFallback="member"
          />
          <Badge variant="outline" className="h-5 px-2 text-[11px]">
            {member.role}
          </Badge>
        </div>
      ))}
    </div>
  );
}

function PostItem({ post }: { post: GroupPost }) {
  return (
    <article className="py-3 text-sm">
      {post.title ? (
        <p className="font-medium text-foreground">{post.title}</p>
      ) : null}
      <ChikaMarkdown
        content={post.content}
        className="mt-1 space-y-2 text-xs leading-5 text-muted-foreground"
      />
      <p className="mt-2 text-[11px] text-muted-foreground">
        {post.authorName || post.authorUsername || post.authorUserId} ·{" "}
        {new Date(post.createdAt).toLocaleString()}
      </p>
    </article>
  );
}

function DetailSection({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <p className="text-xs leading-5 text-muted-foreground">
            {description}
          </p>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
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

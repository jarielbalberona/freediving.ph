"use client";

import Link from "next/link";
import { SignInButton } from "@clerk/nextjs";
import { useParams } from "next/navigation";
import { type ReactNode, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  Lock,
  MapPin,
  MessageSquare,
  PenSquare,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import type { Group, GroupPost, Profile } from "@freediving.ph/types";

import { useSession } from "@/features/auth/session";
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
import { useUserSearch } from "@/features/profiles/hooks/queries";
import { buildDisplayLocation } from "@/features/locations/types";
import { getApiErrorMessage } from "@/lib/http/api-error";
import { UserIdentityHeader } from "@/components/common/UserIdentityHeader";
import {
  CommunityEmptyState,
  CommunityHeader,
  CommunityPageShell,
} from "@/components/community/community-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

export default function GroupDetailPage() {
  const params = useParams<{ id: string }>();
  const groupId = typeof params?.id === "string" ? params.id : "";
  const session = useSession();
  const isSignedIn = session.status === "signed_in";

  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [inviteSearch, setInviteSearch] = useState("");

  const groupQuery = useGroup(groupId);
  const membersQuery = useGroupMembers(groupId, 1, 20);
  const postsQuery = useGroupPosts(groupId, 1, 20);
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
      toast.success("Group post published.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to publish group post"));
    }
  };

  if (groupQuery.isLoading) {
    return (
      <CommunityPageShell>
        <CommunityHeader
          eyebrow="Groups"
          title="Opening group"
          subtitle="Loading group details, members, and recent posts."
          action={
            <Button
              size="sm"
              variant="outline"
              render={<Link href="/groups" />}
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Groups
            </Button>
          }
        />
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      </CommunityPageShell>
    );
  }

  if (groupQuery.error || !group) {
    return (
      <CommunityPageShell>
        <CommunityHeader
          eyebrow="Groups"
          title="Group unavailable"
          subtitle="This group is taking longer than expected to open."
          action={
            <Button
              size="sm"
              variant="outline"
              render={<Link href="/groups" />}
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Groups
            </Button>
          }
        />
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

  return (
    <CommunityPageShell>
      <CommunityHeader
        eyebrow="Groups"
        title={group.name}
        subtitle={
          group.description || "This group has not added a description yet."
        }
        action={
          <Button size="sm" variant="outline" render={<Link href="/groups" />}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Groups
          </Button>
        }
      >
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
      </CommunityHeader>

      <section className="rounded-xl border border-border/70 bg-background/70 px-3 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-foreground">
              Membership
            </h2>
            <p className="text-xs leading-5 text-muted-foreground">
              {group.visibility === "public"
                ? "Public group. Anyone can see members and posts."
                : "Private group. Members can see members and posts."}
            </p>
          </div>
          <div className="shrink-0">
            {isSignedIn ? (
              isMember ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={leaveMutation.isPending}
                  onClick={() => void onLeave()}
                >
                  Leave group
                </Button>
              ) : hasPendingInvite ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    disabled={acceptInviteMutation.isPending}
                    onClick={() => void onAcceptInvite()}
                  >
                    <Check className="mr-1 h-4 w-4" />
                    Accept invite
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={rejectInviteMutation.isPending}
                    onClick={() => void onRejectInvite()}
                  >
                    <X className="mr-1 h-4 w-4" />
                    Reject
                  </Button>
                </div>
              ) : canJoin ? (
                <Button
                  size="sm"
                  disabled={joinMutation.isPending}
                  onClick={() => void onJoin()}
                >
                  Join group
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Invite required.
                </p>
              )
            ) : (
              <SignInButton mode="modal">
                <Button size="sm">
                  {canJoin ? "Sign in to join" : "Sign in"}
                </Button>
              </SignInButton>
            )}
          </div>
        </div>
      </section>

      {isSignedIn && isMember ? (
        <section className="rounded-xl border border-border/70 bg-background/70 px-3 py-3">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <UserPlus className="h-4 w-4" />
            Invite member
          </div>
          <div className="space-y-3">
            <Input
              placeholder="Search people by name or username"
              value={inviteSearch}
              onChange={(event) => setInviteSearch(event.target.value)}
            />
            {inviteSearch.trim().length > 0 ? (
              userSearchQuery.isLoading ? (
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
                        disabled={inviteMutation.isPending}
                        onClick={() => void onInviteMember(profile)}
                      >
                        Invite
                      </Button>
                    </div>
                  ))}
                </div>
              )
            ) : null}
          </div>
        </section>
      ) : null}

      {isSignedIn && isMember ? (
        <section className="rounded-xl border border-border/70 bg-background/70 px-3 py-3">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <PenSquare className="h-4 w-4" />
            Post to the group
          </div>
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
              <Label htmlFor="group-post-content">Content</Label>
              <Textarea
                id="group-post-content"
                placeholder="Write something..."
                value={postContent}
                onChange={(event) => setPostContent(event.target.value)}
              />
            </div>
            <Button
              size="sm"
              className="w-full sm:w-fit"
              disabled={createPostMutation.isPending}
              onClick={() => void onCreatePost()}
            >
              {createPostMutation.isPending ? "Publishing..." : "Publish post"}
            </Button>
          </div>
        </section>
      ) : null}

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
          <div className="divide-y divide-border/70 border-y border-border/70">
            {members.map((member) => (
              <div
                key={member.userId}
                className="flex items-center justify-between gap-3 py-3"
              >
                <UserIdentityHeader
                  displayName={
                    member.displayName || member.username || member.userId
                  }
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
        )}
      </DetailSection>

      <DetailSection title="Recent posts" description="Latest group activity.">
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
    </CommunityPageShell>
  );
}

function PostItem({ post }: { post: GroupPost }) {
  return (
    <article className="py-3 text-sm">
      {post.title ? (
        <p className="font-medium text-foreground">{post.title}</p>
      ) : null}
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        {post.content}
      </p>
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
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className="text-xs leading-5 text-muted-foreground">{description}</p>
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

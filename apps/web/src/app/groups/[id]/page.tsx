"use client";

import Link from "next/link";
import { SignInButton } from "@clerk/nextjs";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Lock,
  MapPin,
  MessageSquare,
  PenSquare,
  Users,
} from "lucide-react";

import type { Group, GroupPost } from "@freediving.ph/types";

import { useSession } from "@/features/auth/session";
import {
  useCreateGroupPost,
  useJoinGroup,
  useLeaveGroup,
} from "@/features/groups/hooks/mutations";
import {
  useGroup,
  useGroupMembers,
  useGroupPosts,
  useUserGroups,
} from "@/features/groups/hooks/queries";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/ui/user-avatar";

export default function GroupDetailPage() {
  const params = useParams<{ id: string }>();
  const groupId = typeof params?.id === "string" ? params.id : "";
  const session = useSession();
  const isSignedIn = session.status === "signed_in";

  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [pendingMembership, setPendingMembership] = useState<
    "none" | "pending"
  >("none");

  const groupQuery = useGroup(groupId);
  const membersQuery = useGroupMembers(groupId, 1, 20);
  const postsQuery = useGroupPosts(groupId, 1, 20);
  const myGroupsQuery = useUserGroups(1, 50, isSignedIn);

  const joinMutation = useJoinGroup();
  const leaveMutation = useLeaveGroup();
  const createPostMutation = useCreateGroupPost();

  const group = groupQuery.data;
  const members = membersQuery.data?.members ?? [];
  const posts = postsQuery.data?.posts ?? [];
  const myGroups = myGroupsQuery.data?.groups ?? [];
  const isMember = useMemo(
    () => myGroups.some((item) => item.id === groupId),
    [myGroups, groupId],
  );

  const onJoin = async () => {
    if (!groupId) return;
    try {
      const membership = await joinMutation.mutateAsync({ groupId });
      if (membership.status === "invited") {
        setPendingMembership("pending");
        toast.success("Join request sent. This group requires approval.");
        return;
      }
      setPendingMembership("none");
      toast.success("Joined group.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to join group"));
    }
  };

  const onLeave = async () => {
    if (!groupId) return;
    try {
      await leaveMutation.mutateAsync({ groupId });
      setPendingMembership("none");
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
      <div className="min-h-full px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-64 w-full rounded-[2rem]" />
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-80 w-full rounded-[1.75rem]" />
            <Skeleton className="h-80 w-full rounded-[1.75rem]" />
          </div>
        </div>
      </div>
    );
  }

  if (groupQuery.error || !group) {
    return (
      <div className="min-h-full px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-6 text-sm text-destructive">
              {getApiErrorMessage(
                groupQuery.error,
                "Failed to load group details",
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const canJoin =
    group.visibility !== "invite_only" && group.joinPolicy !== "invite_only";

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.1),_transparent_26%),linear-gradient(180deg,_hsl(var(--background))_0%,_hsl(var(--muted)/0.24)_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <Link href="/groups">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to groups
            </Button>
          </Link>
        </div>

        <section className="overflow-hidden rounded-[2rem] border border-border/70 bg-card/95 shadow-sm">
          <div className="grid gap-6 p-6 lg:grid-cols-[1.15fr_0.85fr] lg:p-8">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="rounded-full bg-primary text-primary-foreground">
                  {visibilityLabel(group.visibility)}
                </Badge>
                <Badge variant="outline">
                  {joinPolicyLabel(group.joinPolicy)}
                </Badge>
                {group.visibility !== "public" ? (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                ) : null}
              </div>
              <div className="space-y-3">
                <h1 className="font-serif text-4xl tracking-tight text-foreground sm:text-5xl">
                  {group.name}
                </h1>
                <p className="max-w-3xl text-base text-muted-foreground">
                  {group.description || "No description provided."}
                </p>
              </div>
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
            </div>

            <Card className="border-border/70 bg-[linear-gradient(180deg,_hsl(var(--primary)/0.14)_0%,_hsl(var(--card))_100%)]">
              <CardHeader className="space-y-3">
                <CardTitle className="text-xl text-foreground">
                  Membership
                </CardTitle>
                <CardDescription className="text-sm text-foreground/75">
                  {group.visibility === "public"
                    ? "Public group. Anyone can see members and posts."
                    : "Restricted group. Content is only visible to members."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isSignedIn ? (
                  isMember ? (
                    <>
                      <div className="rounded-3xl border border-border/60 bg-background/80 p-4 text-sm text-foreground/80">
                        You are a member.
                      </div>
                      <Button
                        variant="outline"
                        className="w-full"
                        disabled={leaveMutation.isPending}
                        onClick={() => void onLeave()}
                      >
                        Leave group
                      </Button>
                    </>
                  ) : pendingMembership === "pending" ? (
                    <div className="rounded-3xl border border-border/60 bg-background/80 p-4 text-sm text-foreground/80">
                      Join request pending.
                    </div>
                  ) : canJoin ? (
                    <Button
                      className="w-full"
                      disabled={joinMutation.isPending}
                      onClick={() => void onJoin()}
                    >
                      {group.joinPolicy === "approval"
                        ? "Request access"
                        : "Join group"}
                    </Button>
                  ) : (
                    <div className="rounded-3xl border border-border/60 bg-background/80 p-4 text-sm text-foreground/80">
                      Invite only.
                    </div>
                  )
                ) : (
                  <SignInButton mode="modal">
                    <Button className="w-full">
                      Sign in to join or participate
                    </Button>
                  </SignInButton>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        {isSignedIn && isMember ? (
          <section className="rounded-[2rem] border border-border/70 bg-card/95 p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-sm font-medium text-primary">
              <PenSquare className="h-4 w-4" />
              Post to the group
            </div>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="group-post-title">Title</Label>
                <Input
                  id="group-post-title"
                  placeholder="Optional short title"
                  value={postTitle}
                  onChange={(event) => setPostTitle(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="group-post-content">Content</Label>
                <Textarea
                  id="group-post-content"
                  placeholder="Write something..."
                  value={postContent}
                  onChange={(event) => setPostContent(event.target.value)}
                />
              </div>
              <Button
                className="w-full sm:w-fit"
                disabled={createPostMutation.isPending}
                onClick={() => void onCreatePost()}
              >
                {createPostMutation.isPending
                  ? "Publishing..."
                  : "Publish post"}
              </Button>
            </div>
          </section>
        ) : null}

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <Card className="rounded-[1.75rem] border-border/70 bg-card/95">
            <CardHeader>
              <CardTitle>Members</CardTitle>
              <CardDescription>
                Current member list for this group.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {membersQuery.isLoading ? (
                <Skeleton className="h-40 w-full rounded-3xl" />
              ) : membersQuery.error ? (
                <p className="text-sm text-destructive">
                  {getApiErrorMessage(
                    membersQuery.error,
                    "Failed to load members",
                  )}
                </p>
              ) : members.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No members visible yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {members.map((member) => (
                    <div
                      key={member.userId}
                      className="flex items-center justify-between gap-3 rounded-3xl border border-border/60 bg-background/70 p-3"
                    >
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          src={member.avatarUrl}
                          displayName={
                            member.displayName ||
                            member.username ||
                            member.userId
                          }
                        />
                        <div>
                          <p className="font-medium text-foreground">
                            {member.displayName ||
                              member.username ||
                              member.userId}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            @{member.username || "member"}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">{member.role}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[1.75rem] border-border/70 bg-card/95">
            <CardHeader>
              <CardTitle>Recent posts</CardTitle>
              <CardDescription>Latest activity in this group.</CardDescription>
            </CardHeader>
            <CardContent>
              {postsQuery.isLoading ? (
                <Skeleton className="h-40 w-full rounded-3xl" />
              ) : postsQuery.error ? (
                <p className="text-sm text-destructive">
                  {getApiErrorMessage(postsQuery.error, "Failed to load posts")}
                </p>
              ) : posts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No posts yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {posts.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}

function PostCard({ post }: { post: GroupPost }) {
  return (
    <div className="rounded-3xl border border-border/60 bg-background/70 p-4">
      {post.title ? (
        <p className="font-medium text-foreground">{post.title}</p>
      ) : null}
      <p className="mt-1 text-sm text-foreground/85">{post.content}</p>
      <p className="mt-3 text-xs text-muted-foreground">
        {post.authorName || post.authorUsername || post.authorUserId} ·{" "}
        {new Date(post.createdAt).toLocaleString()}
      </p>
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

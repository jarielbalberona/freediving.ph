"use client";

import { Archive, ArrowLeft, MessageSquare, Pencil, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

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
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Textarea } from "@/components/ui/textarea";

import { ChikaMarkdown } from "@/features/chika/components/ChikaMarkdown";
import { MarkdownEditor } from "@/features/chika/components/MarkdownEditor";
import { buildDisplayLocation } from "@/features/locations/types";
import { useSession } from "@/features/auth/session";
import type {
  Group,
  Profile,
} from "@freediving.ph/types";
import { useArchiveGroup, useCreateGroupPost, useInviteGroupMember, useUpdateGroup } from "@/features/groups/hooks/mutations";
import { useGroup, useGroupMembers, useGroupPosts } from "@/features/groups/hooks/queries";
import { useUserSearch } from "@/features/profiles/hooks/queries";
import { getApiErrorMessage } from "@/lib/http/api-error";
import { UserIdentityHeader } from "@/components/common/UserIdentityHeader";
import {
  CommunityEmptyState,
  CommunityHeader,
  CommunityStats,
} from "@/components/community/community-page";
import { GroupManagementShell } from "./group-management-shell";

function canManageGroup(group: Group | null | undefined) {
  if (!group) return false;
  return group.viewerRole === "owner" || group.viewerRole === "moderator";
}

function canArchiveGroup(session: ReturnType<typeof useSession>["me"] | null, group: Group) {
  return Boolean(session?.userId && group.createdBy === session.userId);
}

function locationLabel(group: Group) {
  return (
    buildDisplayLocation({
      locationName: group.locationName,
      formattedAddress: group.formattedAddress,
      regionCode: group.regionCode,
      provinceCode: group.provinceCode,
      cityCode: group.cityCode,
      barangayCode: group.barangayCode,
      locationSource: group.locationSource,
    }) || "Location not set"
  );
}

function visibilityLabel(visibility: Group["visibility"]) {
  return visibility === "private" ? "Private" : "Public";
}

function joinPolicyLabel(policy: Group["joinPolicy"]) {
  return policy === "invite_only" ? "Invite only" : "Open join";
}

export function GroupManagementWorkspacePage({ slug }: { slug: string }) {
  const session = useSession();
  const groupQuery = useGroup(slug, "private", session.status === "signed_in");

  if (session.status === "loading") {
    return (
      <CommunityEmptyState
        title="Loading"
        description="Loading group workspace..."
      />
    );
  }

  if (session.status !== "signed_in") {
    return (
      <CommunityEmptyState
        title="Group management"
        description="Sign in to access group management features."
      />
    );
  }

  if (groupQuery.isLoading) {
    return <CommunityEmptyState title="Loading" description="Loading group workspace..." />;
  }

  if (!groupQuery.data) {
    return (
      <CommunityEmptyState
        title="Group not found"
        description="No group details were available for management."
      />
    );
  }

  if (!canManageGroup(groupQuery.data)) {
    return (
      <CommunityEmptyState
        title="Access denied"
        description="You do not have permission to manage this group."
      />
    );
  }

  return (
    <GroupManagementShell group={groupQuery.data}>
      <GroupManagementOverview group={groupQuery.data} />
    </GroupManagementShell>
  );
}

export function GroupManagementSectionPage({
  slug,
  section,
}: {
  slug: string;
  section: "profile" | "members" | "posts" | "settings";
}) {
  const session = useSession();
  const groupQuery = useGroup(slug, "private", session.status === "signed_in");

  if (session.status === "loading") {
    return (
      <CommunityEmptyState
        title="Loading"
        description="Loading group workspace..."
      />
    );
  }

  if (session.status !== "signed_in") {
    return (
      <CommunityEmptyState
        title="Group management"
        description="Sign in to access group management features."
      />
    );
  }

  if (groupQuery.isLoading) {
    return (
      <CommunityEmptyState
        title="Loading"
        description="Loading group workspace..."
      />
    );
  }

  const group = groupQuery.data;
  if (!group) {
    return <CommunityEmptyState title="Group not found" description="This group is not available." />;
  }

  if (!canManageGroup(group)) {
    return (
      <CommunityEmptyState
        title="Access denied"
        description="You do not have permission to manage this group."
      />
    );
  }

  return (
    <GroupManagementShell group={group}>
      {section === "profile" && <GroupProfileSection group={group} />}
      {section === "members" && <GroupMembersSection group={group} />}
      {section === "posts" && <GroupPostsSection group={group} />}
      {section === "settings" && <GroupSettingsSection group={group} />}
    </GroupManagementShell>
  );
}

function GroupManagementOverview({ group }: { group: Group }) {
  return (
    <>
      <CommunityHeader
        title={group.name}
        subtitle={group.bio || "Group management workspace"}
        action={
          <Button
            size="sm"
            variant="outline"
            nativeButton={false}
            render={<Link href={`/groups/${encodeURIComponent(group.slug)}`} />}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to public
          </Button>
        }
      />

      <CommunityStats
        items={[
          { label: "Members", value: String(group.memberCount), icon: <Users className="h-3.5 w-3.5" /> },
          { label: "Posts", value: String(group.postCount), icon: <MessageSquare className="h-3.5 w-3.5" /> },
          { label: "Visibility", value: visibilityLabel(group.visibility) },
          { label: "Join policy", value: joinPolicyLabel(group.joinPolicy) },
        ]}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <QuickWorkspaceCard
          title="Profile"
          description="Update bio, visibility, and group settings."
          href={`/management/groups/${encodeURIComponent(group.slug)}/profile`}
        />
        <QuickWorkspaceCard
          title="Members"
          description="Invite and review group members."
          href={`/management/groups/${encodeURIComponent(group.slug)}/members`}
        />
        <QuickWorkspaceCard
          title="Posts"
          description="Create and moderate group posts."
          href={`/management/groups/${encodeURIComponent(group.slug)}/posts`}
        />
        <QuickWorkspaceCard
          title="Settings"
          description="Archive or close down group operations."
          href={`/management/groups/${encodeURIComponent(group.slug)}/settings`}
        />
      </div>

      <Card>
        <CardContent className="space-y-2 p-4 text-sm text-muted-foreground">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span>Location</span>
            <span className="font-medium text-foreground">
              {locationLabel(group)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 text-xs">
            <span>Visibility</span>
            <span className="font-medium text-foreground">
              {visibilityLabel(group.visibility)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 text-xs">
            <span>Join policy</span>
            <span className="font-medium text-foreground">
              {joinPolicyLabel(group.joinPolicy)}
            </span>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function GroupProfileSection({ group }: { group: Group }) {
  const updateGroupMutation = useUpdateGroup();
  const session = useSession();

  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState(group.name);
  const [editBio, setEditBio] = useState(group.bio ?? "");
  const [editDescription, setEditDescription] = useState(group.description ?? "");
  const [editVisibility, setEditVisibility] = useState<Group["visibility"]>(group.visibility);
  const [editJoinPolicy, setEditJoinPolicy] = useState<Group["joinPolicy"]>(group.joinPolicy);

  useEffect(() => {
    setEditName(group.name);
    setEditBio(group.bio ?? "");
    setEditDescription(group.description ?? "");
    setEditVisibility(group.visibility);
    setEditJoinPolicy(group.joinPolicy);
  }, [group]);

  const canSave =
    editName.trim().length >= 3 &&
    editName.trim() !== (group.name ?? "").trim() &&
    updateGroupMutation.isPending === false;

  const onUpdateGroup = async () => {
    if (session.status !== "signed_in") return;
    if (editName.trim().length < 3) {
      toast.error("Group name must be at least 3 characters.");
      return;
    }

    try {
      await updateGroupMutation.mutateAsync({
        groupId: group.id,
        data: {
          name: editName.trim(),
          bio: editBio.trim(),
          description: editDescription.trim(),
          visibility: editVisibility,
          joinPolicy: editVisibility === "private" ? "invite_only" : editJoinPolicy,
        },
      });
      setEditOpen(false);
      toast.success("Group details updated.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to update group"));
    }
  };

  return (
    <>
      <CommunityHeader
        title="Profile"
        subtitle="Edit group metadata, details, and visibility."
      />
      <div className="space-y-3">
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={editName} onChange={(event) => setEditName(event.target.value)} />
              <p className="text-xs text-muted-foreground">{Math.max(0, 3 - editName.trim().length)} minimum chars: {editName.trim().length}/3</p>
            </div>
            <div className="space-y-1">
              <Label>Bio</Label>
              <Textarea
                value={editBio}
                maxLength={280}
                onChange={(event) => setEditBio(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">{editBio.length}/280</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Visibility</Label>
                <Select
                  value={editVisibility}
                  onValueChange={(value) => {
                    const next = value as Group["visibility"];
                    setEditVisibility(next);
                    if (next === "private") {
                      setEditJoinPolicy("invite_only");
                    }
                  }}
                  items={[{ value: "public", label: "Public" }, { value: "private", label: "Private" }]}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Join policy</Label>
                <Select
                  value={editJoinPolicy}
                  onValueChange={(value) => setEditJoinPolicy(value as Group["joinPolicy"])}
                  disabled={editVisibility === "private"}
                  items={[{ value: "open", label: "Open join" }, { value: "invite_only", label: "Invite only" }]}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {editVisibility === "private" ? null : <SelectItem value="open">Open join</SelectItem>}
                    <SelectItem value="invite_only">Invite only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Details</Label>
              <MarkdownEditor
                value={editDescription}
                onChange={setEditDescription}
                maxLength={2000}
                minRows={6}
              />
            </div>
            <Button
              size="sm"
              onClick={() => void onUpdateGroup()}
              disabled={editName.trim().length < 3 || updateGroupMutation.isPending}
            >
              <Pencil className="mr-1 h-4 w-4" />
              {updateGroupMutation.isPending ? "Saving..." : canSave ? "Save changes" : "Saved"}
            </Button>
          </CardContent>
        </Card>

        {group.description ? (
          <Card>
            <CardContent className="space-y-2 p-4">
              <p className="text-xs font-medium text-foreground">Current details</p>
              <ChikaMarkdown content={group.description} />
            </CardContent>
          </Card>
        ) : null}
      </div>
    </>
  );
}

function GroupMembersSection({ group }: { group: Group }) {
  const session = useSession();
  const membersQuery = useGroupMembers(group.id, 1, 100, true, "private");
  const inviteMutation = useInviteGroupMember();
  const userSearchQuery = useUserSearch("", 8);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteSearch, setInviteSearch] = useState("");

  const members = membersQuery.data?.members ?? [];
  const activeMembers = new Set(
    members.filter((member) => member.status === "active").map((member) => member.userId),
  );
  const inviteResults = (userSearchQuery.data ?? []).filter(
    (profile) =>
      profile.userId !== session.me?.userId && !activeMembers.has(profile.userId),
  );

  const onInviteMember = async (profile: Profile) => {
    if (!group.id) return;
    try {
      await inviteMutation.mutateAsync({
        groupId: group.id,
        userId: profile.userId,
      });
      setInviteSearch("");
      toast.success(`Invited ${profile.displayName || profile.username}.`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to invite member"));
    }
  };

  return (
    <>
      <CommunityHeader
        title="Members"
        subtitle="Manage membership and invite collaborators."
        action={
          <Button size="sm" onClick={() => setInviteOpen(true)}>
            Invite member
          </Button>
        }
      />

      {membersQuery.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-8 w-full rounded-xl" />
          <Skeleton className="h-8 w-full rounded-xl" />
        </div>
      ) : members.length === 0 ? (
        <CommunityEmptyState
          title="No members yet"
          description="Invite members from this workspace to start building a group."
        />
      ) : (
        <div className="divide-y divide-border/70 border-y border-border/70">
          {members.map((member) => (
            <div key={member.userId} className="flex items-center justify-between py-3">
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
      )}

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="gap-4 sm:max-w-lg!">
          <DialogHeader>
            <DialogTitle>Invite member</DialogTitle>
            <DialogDescription>Search and add people to the group.</DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Search people"
            value={inviteSearch}
            onChange={(event) => setInviteSearch(event.target.value)}
          />
          {inviteSearch.trim().length > 0 ? (
            userSearchQuery.isLoading ? (
              <Skeleton className="h-12 w-full rounded-lg" />
            ) : inviteResults.length === 0 ? (
              <p className="text-xs text-muted-foreground">No users found.</p>
            ) : (
              <div className="space-y-2">
                {inviteResults.map((profile) => (
                  <div key={profile.userId} className="flex items-center justify-between">
                    <UserIdentityHeader
                      displayName={profile.displayName || profile.username || profile.userId}
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function GroupPostsSection({ group }: { group: Group }) {
  const postsQuery = useGroupPosts(group.id, 1, 100, true, "private");
  const createPostMutation = useCreateGroupPost();
  const [postOpen, setPostOpen] = useState(false);
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");

  const posts = postsQuery.data?.posts ?? [];

  const onCreatePost = async () => {
    if (!postContent.trim()) {
      toast.error("Post content is required.");
      return;
    }

    try {
      await createPostMutation.mutateAsync({
        groupId: group.id,
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

  return (
    <>
      <CommunityHeader
        title="Posts"
        subtitle="Create and manage group posts."
        action={
          <Button size="sm" onClick={() => setPostOpen(true)}>
            Create post
          </Button>
        }
      />
      {postsQuery.isLoading ? (
        <Skeleton className="h-24 w-full rounded-xl" />
      ) : posts.length === 0 ? (
        <CommunityEmptyState
          title="No posts yet"
          description="Create the first group post from this workspace."
        />
      ) : (
        <div className="divide-y divide-border/70 border-y border-border/70 rounded-md">
          {posts.map((post) => (
            <article key={post.id} className="space-y-2 py-3">
              {post.title ? <h3 className="text-sm font-semibold text-foreground">{post.title}</h3> : null}
              <ChikaMarkdown
                content={post.content}
                className="text-xs text-muted-foreground"
              />
            </article>
          ))}
        </div>
      )}

      <Dialog open={postOpen} onOpenChange={setPostOpen}>
        <DialogContent className="gap-4 sm:max-w-2xl!">
          <DialogHeader>
            <DialogTitle>Post to group</DialogTitle>
            <DialogDescription>Create a post for this workspace.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Title (optional)</Label>
              <Input
                value={postTitle}
                onChange={(event) => setPostTitle(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Content</Label>
              <MarkdownEditor
                value={postContent}
                onChange={setPostContent}
                maxLength={10000}
                minRows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPostOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => void onCreatePost()}
              disabled={createPostMutation.isPending}
            >
              {createPostMutation.isPending ? "Publishing..." : "Publish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function GroupSettingsSection({ group }: { group: Group }) {
  const session = useSession();
  const archiveGroupMutation = useArchiveGroup();

  const onArchiveGroup = async () => {
    try {
      await archiveGroupMutation.mutateAsync({ groupId: group.id });
      toast.success("Group archived.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to archive group"));
    }
  };

  return (
    <>
      <CommunityHeader title="Settings" subtitle="Group-level administrative actions." />
      <Card>
        <CardContent className="space-y-2 p-4 text-sm">
          <p className="text-xs text-muted-foreground">
            Status management is intentionally limited in the workspace to protect existing data.
          </p>
          <p className="text-xs">
            Group status: <Badge className="h-5 px-2">{group.status}</Badge>
          </p>
          {canArchiveGroup(session.me, group) ? (
            <div className="pt-2">
              <AlertDialog>
                <AlertDialogTrigger
                  render={
                    <Button type="button" variant="destructive" size="sm">
                      <Archive className="mr-1 h-4 w-4" />
                      Archive group
                    </Button>
                  }
                >
                  Archive group
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Archive group?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This removes the group from public lists. Records stay intact.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      disabled={archiveGroupMutation.isPending}
                      onClick={() => void onArchiveGroup()}
                    >
                      {archiveGroupMutation.isPending ? "Archiving..." : "Archive group"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </>
  );
}

function QuickWorkspaceCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-border/70 bg-muted/10 p-3 text-sm transition hover:bg-muted/30"
    >
      <h3 className="font-medium text-foreground">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </Link>
  );
}

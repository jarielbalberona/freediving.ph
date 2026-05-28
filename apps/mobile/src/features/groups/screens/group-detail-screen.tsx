import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Text, TextInput, View } from "react-native";

import { SocialMetadataLine, StatusPill, UserIdentityRow } from "@/components/social";
import {
  MobileEmptyState,
  MobileErrorState,
  MobileLoadingState,
  MobileScrollScreen,
  MobileSection,
} from "@/components/shell";
import { MobileButton } from "@/components/ui/mobile-button";
import {
  useGroupMembersQuery,
  useGroupPostsQuery,
  useIsSignedIn,
} from "@/features/groups/hooks/use-group-member-queries";
import {
  useAcceptGroupInviteMutation,
  useCreateGroupPostMutation,
  useJoinGroupMutation,
  useLeaveGroupMutation,
  useRejectGroupInviteMutation,
} from "@/features/groups/hooks/use-group-mutations";
import { useGroupDetailQuery } from "@/features/groups/hooks/use-groups-query";
import { useLocalDraft } from "@/local/drafts/use-local-draft";
import { useOutbox } from "@/local/outbox/use-outbox";
import { PendingSyncPanel } from "@/local/sync/pending-sync-panel";

const firstParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export function GroupDetailScreen() {
  const params = useLocalSearchParams<{ slug?: string | string[] }>();
  const slug = firstParam(params.slug);
  const isSignedIn = useIsSignedIn();
  const groupQuery = useGroupDetailQuery(slug);
  const group = groupQuery.data?.group;
  const membersQuery = useGroupMembersQuery(group?.id, Boolean(group));
  const postsQuery = useGroupPostsQuery(group?.id, Boolean(group));
  const joinMutation = useJoinGroupMutation(slug ?? "", group?.id ?? "");
  const leaveMutation = useLeaveGroupMutation(slug ?? "", group?.id ?? "");
  const acceptInviteMutation = useAcceptGroupInviteMutation(
    slug ?? "",
    group?.id ?? "",
  );
  const rejectInviteMutation = useRejectGroupInviteMutation(
    slug ?? "",
    group?.id ?? "",
  );
  const createPostMutation = useCreateGroupPostMutation(slug ?? "", group?.id ?? "");
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [postText, setPostText] = useState("");
  const [postTitle, setPostTitle] = useState("");
  const groupPostDraft = useLocalDraft<{
    content: string;
    groupId?: string;
    title?: string;
  }>(
    "group_post",
  );
  const outbox = useOutbox();
  const posts = postsQuery.data?.posts ?? [];
  const members = membersQuery.data?.members ?? [];

  useEffect(() => {
    const draft = groupPostDraft.draft;
    if (!draft || draft.payload.groupId !== group?.id) return;
    setPostText(draft.payload.content);
    setPostTitle(draft.payload.title ?? "");
  }, [group?.id, groupPostDraft.draft]);

  if (!slug) {
    return (
      <MobileScrollScreen subtitle="Group" title="Groups">
        <Stack.Screen options={{ title: "Group unavailable" }} />
        <MobileEmptyState description="Choose a group to view it." title="Group not found" />
      </MobileScrollScreen>
    );
  }

  if (groupQuery.isLoading) {
    return (
      <MobileScrollScreen subtitle="Group" title="Groups">
        <Stack.Screen options={{ title: "Groups" }} />
        <MobileLoadingState message="Loading group." />
      </MobileScrollScreen>
    );
  }

  if (groupQuery.error || !group) {
    return (
      <MobileScrollScreen subtitle="Group" title="Groups">
        <Stack.Screen options={{ title: "Group unavailable" }} />
        <MobileErrorState
          message="This group could not be loaded."
          title="Group unavailable"
        />
      </MobileScrollScreen>
    );
  }

  const isMember = group.viewerMembershipStatus === "active";
  const isInvited = group.viewerMembershipStatus === "invited";
  const canJoin = isSignedIn && !isMember && group.joinPolicy === "open";
  const canLeave = isSignedIn && isMember && group.viewerRole !== "owner";
  const membershipPending =
    joinMutation.isPending ||
    leaveMutation.isPending ||
    acceptInviteMutation.isPending ||
    rejectInviteMutation.isPending;

  const visibilityLabel =
    group.visibility === "public" ? "Public" : "Private";

  return (
    <>
      <Stack.Screen options={{ title: group.name }} />
      <MobileScrollScreen subtitle="Group" title="Groups">
        <View className="gap-3">
          <Text className="text-base font-semibold text-foreground">{group.name}</Text>
          <View className="gap-1">
            <SocialMetadataLine
              values={[
                visibilityLabel,
                group.joinPolicy === "open" ? "Open to join" : "Invite only",
                `${group.memberCount} members`,
                `${group.postCount} posts`,
              ]}
            />
            {(group.bio || group.description) ? (
              <Text className="text-sm leading-6 text-muted-foreground">
                {group.bio || group.description}
              </Text>
            ) : null}
          </View>
          {isMember ? (
            <View className="flex-row items-center gap-2">
              <StatusPill tone="primary">Joined</StatusPill>
              <Text className="text-sm text-muted-foreground">
                You are a member.
              </Text>
            </View>
          ) : null}
          {canJoin ? (
            <MobileButton
              disabled={membershipPending}
              onPress={() => {
                setActionMessage(null);
                joinMutation.mutate(undefined, {
                  onError: () =>
                    setActionMessage("Could not join this group. Try again."),
                  onSuccess: () => setActionMessage("You joined this group."),
                });
              }}
            >
              Join group
            </MobileButton>
          ) : null}
          {isSignedIn && isInvited ? (
            <View className="gap-2">
              <Text className="text-sm text-muted-foreground">
                You have an invitation to this group.
              </Text>
              <View className="flex-row gap-2">
                <View className="flex-1">
                  <MobileButton
                    disabled={membershipPending}
                    onPress={() => {
                      setActionMessage(null);
                      acceptInviteMutation.mutate(undefined, {
                        onError: () =>
                          setActionMessage(
                            "Could not accept this invite. Try again.",
                          ),
                        onSuccess: () =>
                          setActionMessage("Group invitation accepted."),
                      });
                    }}
                  >
                    Accept invite
                  </MobileButton>
                </View>
                <View className="flex-1">
                  <MobileButton
                    disabled={membershipPending}
                    variant="secondary"
                    onPress={() => {
                      setActionMessage(null);
                      rejectInviteMutation.mutate(undefined, {
                        onError: () =>
                          setActionMessage(
                            "Could not decline this invite. Try again.",
                          ),
                        onSuccess: () =>
                          setActionMessage("Group invitation declined."),
                      });
                    }}
                  >
                    Decline
                  </MobileButton>
                </View>
              </View>
            </View>
          ) : null}
          {isSignedIn && !isMember && group.joinPolicy === "invite_only" && !isInvited ? (
            <Text className="text-sm text-muted-foreground">
              This group is invite only.
            </Text>
          ) : null}
          {canLeave ? (
            <MobileButton
              disabled={membershipPending}
              variant="danger"
              onPress={() => {
                setActionMessage(null);
                leaveMutation.mutate(undefined, {
                  onError: () =>
                    setActionMessage("Could not leave this group. Try again."),
                  onSuccess: () => setActionMessage("You left this group."),
                });
              }}
            >
              Leave group
            </MobileButton>
          ) : null}
          {actionMessage ? (
            <Text className="text-sm text-muted-foreground">{actionMessage}</Text>
          ) : null}
          {!isSignedIn ? (
            <Text className="text-sm text-muted-foreground">
              Sign in to join and post.
            </Text>
          ) : null}
        </View>

        {isMember ? (
          <MobileSection title="Post to group">
            <View className="gap-3">
              <PendingSyncPanel
                isSyncing={outbox.isSyncing}
                items={outbox.items}
                message={
                  groupPostDraft.status === "saved" ? "Saved as draft" : outbox.message
                }
                onDiscard={outbox.discard}
                onSyncNow={outbox.syncNow}
              />
              <TextInput
                className="rounded-2xl border border-border bg-card p-3 text-foreground"
                onChangeText={setPostTitle}
                placeholder="Title, optional"
                placeholderTextColor="#64748b"
                value={postTitle}
              />
              <TextInput
                className="min-h-24 rounded-2xl border border-border bg-card p-3 text-foreground"
                multiline
                onChangeText={setPostText}
                placeholder="Share an update with the group"
                placeholderTextColor="#64748b"
                value={postText}
              />
              <MobileButton
                variant="secondary"
                onPress={() =>
                  void groupPostDraft.save({
                    content: postText,
                    groupId: group.id,
                    title: postTitle.trim() || undefined,
                  })
                }
              >
                Save draft
              </MobileButton>
              {groupPostDraft.draft?.payload.groupId === group.id ? (
                <MobileButton
                  variant="ghost"
                  onPress={() =>
                    void groupPostDraft.discard().then(() => {
                      setActionMessage("Draft discarded.");
                      setPostText("");
                      setPostTitle("");
                    })
                  }
                >
                  Discard draft
                </MobileButton>
              ) : null}
              <MobileButton
                disabled={createPostMutation.isPending || postText.trim().length === 0}
                onPress={() => {
                  const content = postText.trim();
                  if (!content) return;
                  createPostMutation.mutate(
                    { content, title: postTitle.trim() || undefined },
                    {
                      onError: () => {
                        void groupPostDraft.save({
                          content,
                          groupId: group.id,
                          title: postTitle.trim() || undefined,
                        });
                        setActionMessage("Could not post to group. Saved as draft.");
                      },
                      onSuccess: () => {
                        void groupPostDraft.clearSubmitted();
                        setPostText("");
                        setPostTitle("");
                      },
                    },
                  );
                }}
              >
                Post
              </MobileButton>
            </View>
          </MobileSection>
        ) : null}

        <View className="gap-1">
          <Text className="text-base font-semibold text-foreground">Posts</Text>
          {postsQuery.isLoading ? <MobileLoadingState message="Loading posts." /> : null}
          {postsQuery.error ? (
            <View className="gap-3">
              <MobileErrorState
                message="Group posts are taking longer than expected to load."
                title="Posts unavailable"
              />
              <MobileButton
                variant="secondary"
                onPress={() => void postsQuery.refetch()}
              >
                Try again
              </MobileButton>
            </View>
          ) : null}
          {!postsQuery.isLoading && !postsQuery.error && posts.length === 0 ? (
            <MobileEmptyState
              description={
                isMember
                  ? "No group posts yet."
                  : "Public group posts will appear here when available."
              }
              title="No posts"
            />
          ) : null}
          {posts.length > 0 ? (
            <View>
              {posts.map((post) => (
                  <UserIdentityRow
                    avatarUrl={post.authorAvatarUrl}
                    bottomSlot={
                      <View className="mt-2">
                      {post.title ? (
                        <Text className="text-base font-semibold leading-6 text-foreground">
                          {post.title}
                        </Text>
                      ) : null}
                      <Text className="mt-1 text-sm leading-6 text-muted-foreground">
                        {post.content}
                      </Text>
                      <SocialMetadataLine
                        values={[
                          new Date(post.createdAt).toLocaleDateString("en-PH", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          }),
                          `${post.commentCount} comments`,
                        ]}
                      />
                    </View>
                  }
                  key={post.id}
                  displayName={post.authorName || post.authorUsername || "Group member"}
                  locationText={new Date(post.createdAt).toLocaleDateString("en-PH", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                  username={post.authorUsername}
                  showLocation
                />
              ))}
            </View>
          ) : null}
        </View>

        <View className="gap-1">
          <Text className="text-base font-semibold text-foreground">Members</Text>
          {membersQuery.isLoading ? (
            <MobileLoadingState message="Loading members." />
          ) : null}
          {membersQuery.error ? (
            <MobileErrorState
              message="Member preview is not available for this group."
              title="Members unavailable"
            />
          ) : null}
          {!membersQuery.isLoading && !membersQuery.error && members.length === 0 ? (
            <MobileEmptyState
              description="Member preview is available when the group exposes it."
              title="No member preview"
            />
          ) : null}
          {!membersQuery.isLoading && !membersQuery.error && members.length > 0 ? (
            <View>
              {members.map((member) => (
                <UserIdentityRow
                  avatarUrl={member.avatarUrl}
                  key={member.userId}
                  bottomSlot={
                    <Text className="mt-1 text-sm text-muted-foreground">
                      {member.role}
                    </Text>
                  }
                  displayName={member.displayName || member.username || "Member"}
                  username={member.username}
                  showLocation={false}
                />
              ))}
            </View>
          ) : null}
        </View>
      </MobileScrollScreen>
    </>
  );
}

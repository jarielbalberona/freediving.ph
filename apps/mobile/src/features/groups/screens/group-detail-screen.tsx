import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Text, TextInput, View } from "react-native";

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
  useCreateGroupPostMutation,
  useJoinGroupMutation,
  useLeaveGroupMutation,
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
  const membersQuery = useGroupMembersQuery(group?.id, isSignedIn && Boolean(group));
  const postsQuery = useGroupPostsQuery(group?.id, isSignedIn && Boolean(group));
  const joinMutation = useJoinGroupMutation(slug ?? "", group?.id ?? "");
  const leaveMutation = useLeaveGroupMutation(slug ?? "", group?.id ?? "");
  const createPostMutation = useCreateGroupPostMutation(slug ?? "", group?.id ?? "");
  const [postText, setPostText] = useState("");
  const groupPostDraft = useLocalDraft<{ content: string; groupId?: string }>(
    "group_post",
  );
  const outbox = useOutbox();
  const posts = postsQuery.data?.posts ?? [];
  const members = membersQuery.data?.members ?? [];

  useEffect(() => {
    const draft = groupPostDraft.draft;
    if (!draft || draft.payload.groupId !== group?.id) return;
    setPostText(draft.payload.content);
  }, [group?.id, groupPostDraft.draft]);

  if (!slug) {
    return (
      <MobileScrollScreen subtitle="Group" title="Groups">
        <MobileEmptyState description="Choose a group to view it." title="Group not found" />
      </MobileScrollScreen>
    );
  }

  if (groupQuery.isLoading) {
    return (
      <MobileScrollScreen subtitle="Group" title="Groups">
        <MobileLoadingState message="Loading group." />
      </MobileScrollScreen>
    );
  }

  if (groupQuery.error || !group) {
    return (
      <MobileScrollScreen subtitle="Group" title="Groups">
        <MobileErrorState
          message="This group could not be loaded."
          title="Group unavailable"
        />
      </MobileScrollScreen>
    );
  }

  const isMember = group.viewerMembershipStatus === "active";
  const canJoin = isSignedIn && !isMember && group.joinPolicy === "open";
  const canLeave = isSignedIn && isMember && group.viewerRole !== "owner";

  return (
    <>
      <Stack.Screen options={{ title: group.name }} />
      <MobileScrollScreen subtitle="Group" title="Groups">
        <MobileSection title={group.name} description={group.bio || group.description}>
          <View className="gap-3">
            <View className="flex-row flex-wrap gap-2">
              <Text className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                {group.visibility}
              </Text>
              <Text className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                {group.memberCount} members
              </Text>
              <Text className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                {group.postCount} posts
              </Text>
            </View>
            {canJoin ? (
              <MobileButton
                disabled={joinMutation.isPending}
                onPress={() => joinMutation.mutate()}
              >
                Join group
              </MobileButton>
            ) : null}
            {canLeave ? (
              <MobileButton
                disabled={leaveMutation.isPending}
                variant="danger"
                onPress={() => leaveMutation.mutate()}
              >
                Leave group
              </MobileButton>
            ) : null}
            {!isSignedIn ? (
              <Text className="text-sm text-muted-foreground">
                Sign in to join, view member details, and post.
              </Text>
            ) : null}
          </View>
        </MobileSection>

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
                  })
                }
              >
                Save draft
              </MobileButton>
              <MobileButton
                disabled={createPostMutation.isPending || postText.trim().length === 0}
                onPress={() => {
                  const content = postText.trim();
                  if (!content) return;
                  createPostMutation.mutate(
                    { content },
                    {
                      onError: () => {
                        void groupPostDraft.save({
                          content,
                          groupId: group.id,
                        });
                        void outbox.enqueue({
                          entityId: group.id,
                          entityType: "group_post",
                          operationType: "group_post_create",
                          payload: { content, groupId: group.id },
                        });
                      },
                      onSuccess: () => {
                        void groupPostDraft.clearSubmitted();
                        setPostText("");
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

        <MobileSection title="Posts">
          {postsQuery.isLoading ? <MobileLoadingState message="Loading posts." /> : null}
          {!postsQuery.isLoading && posts.length === 0 ? (
            <MobileEmptyState
              description={isMember ? "No group posts yet." : "Join the group to see member posts when available."}
              title="No posts"
            />
          ) : null}
          {posts.length > 0 ? (
            <View className="gap-3">
              {posts.map((post) => (
                <View key={post.id} className="rounded-2xl border border-border bg-card p-4">
                  <Text className="text-sm font-semibold text-foreground">
                    {post.authorName || "Group member"}
                  </Text>
                  {post.title ? (
                    <Text className="mt-2 text-base font-semibold text-foreground">
                      {post.title}
                    </Text>
                  ) : null}
                  <Text className="mt-2 text-sm leading-6 text-muted-foreground">
                    {post.content}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </MobileSection>

        <MobileSection title="Members">
          {members.length === 0 ? (
            <MobileEmptyState
              description="Member preview is available after joining when the group exposes it."
              title="No member preview"
            />
          ) : (
            <View className="gap-2">
              {members.map((member) => (
                <Text key={member.userId} className="text-sm text-muted-foreground">
                  {member.displayName || member.username || "Member"} · {member.role}
                </Text>
              ))}
            </View>
          )}
        </MobileSection>
      </MobileScrollScreen>
    </>
  );
}

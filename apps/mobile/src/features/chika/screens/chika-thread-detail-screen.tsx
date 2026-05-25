import { Stack, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Text, TextInput, View } from "react-native";

import {
  MobileEmptyState,
  MobileErrorState,
  MobileLoadingState,
  MobileScrollScreen,
  MobileSection,
} from "@/components/shell";
import { MobileButton } from "@/components/ui/mobile-button";
import { ChikaCommentCard } from "@/features/chika/components/chika-comment-card";
import {
  useCreateChikaCommentMutation,
  useSetChikaCommentReactionMutation,
  useSetChikaThreadReactionMutation,
} from "@/features/chika/hooks/use-chika-mutations";
import { useChikaCommentsQuery } from "@/features/chika/hooks/use-chika-comments-query";
import { useChikaThreadDetailQuery } from "@/features/chika/hooks/use-chika-thread-detail-query";
import {
  chikaAuthorLabel,
  formatChikaDate,
  stripMarkdownPreview,
} from "@/features/chika/lib/chika-format";

const firstParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export function ChikaThreadDetailScreen() {
  const params = useLocalSearchParams<{ slug?: string | string[] }>();
  const slug = firstParam(params.slug);
  const threadQuery = useChikaThreadDetailQuery(slug);
  const thread = threadQuery.data;
  const commentsQuery = useChikaCommentsQuery(thread?.id);
  const comments = commentsQuery.data?.items ?? [];
  const createComment = useCreateChikaCommentMutation(thread?.id ?? "");
  const threadReaction = useSetChikaThreadReactionMutation(thread?.id ?? "");
  const commentReaction = useSetChikaCommentReactionMutation(thread?.id ?? "");
  const [replyTo, setReplyTo] = useState<string | undefined>();
  const [commentDraft, setCommentDraft] = useState("");
  const nestedComments = useMemo(() => {
    const byParent = new Map<string, typeof comments>();
    const roots: typeof comments = [];
    for (const comment of comments) {
      const parentId = comment.parentCommentId;
      if (!parentId) {
        roots.push(comment);
        continue;
      }
      byParent.set(parentId, [...(byParent.get(parentId) ?? []), comment]);
    }
    const flatten = (items: typeof comments, depth = 0): Array<{ comment: (typeof comments)[number]; depth: number }> =>
      items.flatMap((comment) => [
        { comment, depth },
        ...flatten(byParent.get(comment.id) ?? [], depth + 1),
      ]);
    return flatten(roots);
  }, [comments]);

  if (!slug) {
    return (
      <MobileScrollScreen subtitle="Thread" title="Chika">
        <MobileEmptyState
          description="Choose a Chika thread to read the conversation."
          title="Thread not found"
        />
      </MobileScrollScreen>
    );
  }

  if (threadQuery.isLoading) {
    return (
      <MobileScrollScreen subtitle="Thread" title="Chika">
        <MobileLoadingState message="Loading Chika thread." />
      </MobileScrollScreen>
    );
  }

  if (threadQuery.error) {
    return (
      <MobileScrollScreen subtitle="Thread" title="Chika">
        <View className="gap-3">
          <MobileErrorState
            message="This Chika thread is taking longer than expected to load."
            title="Thread unavailable"
          />
          <MobileButton variant="secondary" onPress={() => void threadQuery.refetch()}>
            Try again
          </MobileButton>
        </View>
      </MobileScrollScreen>
    );
  }

  if (!thread) {
    return (
      <MobileScrollScreen subtitle="Thread" title="Chika">
        <MobileEmptyState
          description="This Chika thread may have been removed or is not available yet."
          title="Thread not found"
        />
      </MobileScrollScreen>
    );
  }

  const authorLabel = chikaAuthorLabel(thread);
  const dateLabel = formatChikaDate(thread.createdAt);
  const content = stripMarkdownPreview(thread.content);

  return (
    <>
      <Stack.Screen options={{ title: thread.title }} />
      <MobileScrollScreen subtitle={thread.categoryName || "Thread"} title="Chika">
        <MobileSection title={thread.title || "Untitled Chika"}>
          <View className="gap-4">
            <View className="flex-row flex-wrap gap-2">
              <Text className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                {thread.categoryName || "Chika"}
              </Text>
              <Text className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                {authorLabel}
              </Text>
              {dateLabel ? (
                <Text className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                  {dateLabel}
                </Text>
              ) : null}
              {thread.categoryPseudonymous ? (
                <Text className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                  Anonymous
                </Text>
              ) : null}
              {thread.isHidden ? (
                <Text className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                  Hidden
                </Text>
              ) : null}
            </View>

            <Text className="text-sm leading-6 text-muted-foreground">
              {content || "This Chika thread has no content yet."}
            </Text>

            <Text className="text-xs text-muted-foreground">
              {thread.commentCount} {thread.commentCount === 1 ? "reply" : "replies"}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              <MobileButton
                variant={thread.userReaction === "upvote" ? "primary" : "secondary"}
                onPress={() =>
                  threadReaction.mutate(
                    thread.userReaction === "upvote" ? null : "upvote",
                  )
                }
              >
                Up · {thread.voteCount}
              </MobileButton>
              <MobileButton
                variant={thread.userReaction === "downvote" ? "primary" : "secondary"}
                onPress={() =>
                  threadReaction.mutate(
                    thread.userReaction === "downvote" ? null : "downvote",
                  )
                }
              >
                Down
              </MobileButton>
            </View>
          </View>
        </MobileSection>

        <MobileSection title="Replies">
          <View className="mb-4 gap-3">
            {replyTo ? (
              <Text className="text-xs text-muted-foreground">
                Replying to a comment
              </Text>
            ) : null}
            <TextInput
              className="min-h-24 rounded-2xl border border-border bg-card p-3 text-foreground"
              multiline
              onChangeText={setCommentDraft}
              placeholder="Write a reply"
              placeholderTextColor="#64748b"
              value={commentDraft}
            />
            <View className="flex-row gap-2">
              <View className="flex-1">
                <MobileButton
                  disabled={createComment.isPending || commentDraft.trim().length === 0}
                  onPress={() => {
                    const content = commentDraft.trim();
                    if (!content || !thread.id) return;
                    createComment.mutate(
                      { content, parentCommentId: replyTo },
                      {
                        onSuccess: () => {
                          setCommentDraft("");
                          setReplyTo(undefined);
                        },
                      },
                    );
                  }}
                >
                  Post reply
                </MobileButton>
              </View>
              {replyTo ? (
                <View className="flex-1">
                  <MobileButton variant="ghost" onPress={() => setReplyTo(undefined)}>
                    Cancel
                  </MobileButton>
                </View>
              ) : null}
            </View>
          </View>

          {commentsQuery.isLoading ? (
            <MobileLoadingState message="Loading replies." />
          ) : null}

          {commentsQuery.error ? (
            <View className="gap-3">
              <MobileErrorState
                message="Replies are taking longer than expected to load."
                title="Replies unavailable"
              />
              <MobileButton
                variant="secondary"
                onPress={() => void commentsQuery.refetch()}
              >
                Try again
              </MobileButton>
            </View>
          ) : null}

          {!commentsQuery.isLoading && !commentsQuery.error && comments.length === 0 ? (
            <MobileEmptyState
              description="Replies will appear here as the community joins the conversation."
              title="No replies yet"
            />
          ) : null}

          {!commentsQuery.isLoading && !commentsQuery.error && comments.length > 0 ? (
            <View className="gap-3">
              {nestedComments.map(({ comment, depth }) => (
                <ChikaCommentCard
                  key={comment.id}
                  comment={comment}
                  depth={depth}
                  onReact={(commentId, type) =>
                    commentReaction.mutate({ commentId, type })
                  }
                  onReply={setReplyTo}
                />
              ))}
            </View>
          ) : null}
        </MobileSection>
      </MobileScrollScreen>
    </>
  );
}

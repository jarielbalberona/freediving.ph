import { Stack, useGlobalSearchParams, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { useAuth } from "@clerk/expo";

import {
  MobileEmptyState,
  MobileErrorState,
  MobileLoadingState,
  MobileScrollScreen,
  MobileSection,
} from "@/components/shell";
import { MobileButton } from "@/components/ui/mobile-button";
import { ChikaCommentCard } from "@/features/chika/components/chika-comment-card";
import { ReportAction } from "@/features/safety/components/report-action";
import {
  useCreateChikaCommentMutation,
  useSetChikaCommentReactionMutation,
  useSetChikaThreadReactionMutation,
} from "@/features/chika/hooks/use-chika-mutations";
import { useChikaCommentsQuery } from "@/features/chika/hooks/use-chika-comments-query";
import { useChikaThreadDetailQuery } from "@/features/chika/hooks/use-chika-thread-detail-query";
import { useLocalDraft } from "@/local/drafts/use-local-draft";
import { shouldQueueFailedMutation } from "@/local/outbox/supported-operations";
import { useOutbox } from "@/local/outbox/use-outbox";
import { PendingSyncPanel } from "@/local/sync/pending-sync-panel";
import { FphgoApiError } from "@/lib/api/fphgo-client";
import { LinkedText } from "@/features/shared/links/components/LinkedText";
import {
  chikaAuthorLabel,
  formatChikaDate,
  safeChikaSlug,
  stripMarkdownPreview,
} from "@/features/chika/lib/chika-format";

const firstParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const chikaActionErrorMessage = (fallback: string, error: unknown) =>
  error instanceof FphgoApiError ? error.message : fallback;

const shouldFallbackToLocalChikaState = (error: unknown) =>
  error instanceof TypeError ||
  (error instanceof FphgoApiError && shouldQueueFailedMutation(error));

export function ChikaThreadDetailScreen() {
  const localParams = useLocalSearchParams<{ slug?: string | string[] }>();
  const globalParams = useGlobalSearchParams<{ slug?: string | string[] }>();
  const slug = safeChikaSlug(firstParam(globalParams.slug) ?? firstParam(localParams.slug));
  const threadQuery = useChikaThreadDetailQuery(slug);
  const { isLoaded, isSignedIn } = useAuth();
  const canUseChikaActions = isLoaded && Boolean(isSignedIn);
  const thread =
    threadQuery.data && safeChikaSlug(threadQuery.data.slug) === slug
      ? threadQuery.data
      : undefined;
  const commentsQuery = useChikaCommentsQuery(thread?.id);
  const comments = commentsQuery.data?.items ?? [];
  const createComment = useCreateChikaCommentMutation(thread?.id ?? "");
  const threadReaction = useSetChikaThreadReactionMutation(
    thread?.id ?? "",
    thread?.slug ?? slug ?? "",
  );
  const commentReaction = useSetChikaCommentReactionMutation(thread?.id ?? "");
  const [replyTo, setReplyTo] = useState<string | undefined>();
  const [commentDraft, setCommentDraft] = useState("");
  const [actionMessage, setActionMessage] = useState<string | undefined>();
  const localCommentDraft = useLocalDraft<{
    content: string;
    parentCommentId?: string;
    threadId?: string;
  }>("chika_comment");
  const outbox = useOutbox();
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
  const replyTarget = useMemo(() => {
    if (!replyTo) return undefined;
    return comments.find((comment) => comment.id === replyTo);
  }, [comments, replyTo]);

  useEffect(() => {
    const draft = localCommentDraft.draft;
    if (!draft || draft.payload.threadId !== thread?.id) return;
    setCommentDraft(draft.payload.content);
    setReplyTo(draft.payload.parentCommentId);
  }, [localCommentDraft.draft, thread?.id]);

  useEffect(() => {
    setActionMessage(undefined);
    setCommentDraft("");
    setReplyTo(undefined);
  }, [slug]);

  const requireSignedIn = () => {
    if (!isLoaded) {
      setActionMessage("Checking your session. Try again in a moment.");
      return false;
    }
    if (!isSignedIn) {
      setActionMessage("Sign in to reply or vote in Chika.");
      return false;
    }
    setActionMessage(undefined);
    return true;
  };

  const canQueueFailedMutation = (error: unknown) =>
    isLoaded && isSignedIn && shouldFallbackToLocalChikaState(error);

  if (!slug) {
    return (
      <>
        <Stack.Screen options={{ title: "Chika" }} />
        <MobileScrollScreen subtitle="Thread" title="Chika">
          <MobileEmptyState
            description="Choose a Chika thread to read the conversation."
            title="Thread not found"
          />
        </MobileScrollScreen>
      </>
    );
  }

  if (threadQuery.isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: "Chika" }} />
        <MobileScrollScreen subtitle="Thread" title="Chika">
          <MobileLoadingState message="Loading Chika thread." />
        </MobileScrollScreen>
      </>
    );
  }

  if (threadQuery.error) {
    return (
      <>
        <Stack.Screen options={{ title: "Chika" }} />
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
      </>
    );
  }

  if (!thread) {
    return (
      <>
        <Stack.Screen options={{ title: "Chika" }} />
        <MobileScrollScreen subtitle="Thread" title="Chika">
          <MobileEmptyState
            description="This Chika thread may have been removed or is not available yet."
            title="Thread not found"
          />
        </MobileScrollScreen>
      </>
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

            <LinkedText
              className="text-sm leading-6 text-muted-foreground"
              text={content || "This Chika thread has no content yet."}
            />

            <Text className="text-xs text-muted-foreground">
              {thread.commentCount} {thread.commentCount === 1 ? "reply" : "replies"}
            </Text>
            {canUseChikaActions ? (
              <View className="self-start">
                <ReportAction
                  buttonLabel="Report thread"
                  contextLabel="thread"
                  targetId={thread.id}
                  targetType="chika_thread"
                />
              </View>
            ) : null}
            {canUseChikaActions ? (
              <View className="flex-row flex-wrap gap-2">
                <MobileButton
                  variant={thread.userReaction === "upvote" ? "primary" : "secondary"}
                  disabled={threadReaction.isPending}
                  onPress={() =>
                    requireSignedIn()
                      ? threadReaction.mutate(
                          thread.userReaction === "upvote" ? null : "upvote",
                          {
                            onError: (error) => {
                              if (canQueueFailedMutation(error)) {
                                setActionMessage("Vote saved. It will sync when possible.");
                                void outbox.enqueue({
                                    entityId: thread.id,
                                    entityType: "chika_thread",
                                    operationType: "chika_thread_reaction",
                                    payload: {
                                      threadId: thread.id,
                                      type:
                                        thread.userReaction === "upvote"
                                          ? null
                                          : "upvote",
                                    },
                                  });
                                return;
                              }
                              setActionMessage(
                                chikaActionErrorMessage(
                                  "Could not update your vote.",
                                  error,
                                ),
                              );
                            },
                          },
                        )
                      : undefined
                  }
                >
                  Up · {thread.voteCount}
                </MobileButton>
                <MobileButton
                  variant={thread.userReaction === "downvote" ? "primary" : "secondary"}
                  disabled={threadReaction.isPending}
                  onPress={() =>
                    requireSignedIn()
                      ? threadReaction.mutate(
                          thread.userReaction === "downvote" ? null : "downvote",
                          {
                            onError: (error) => {
                              if (canQueueFailedMutation(error)) {
                                setActionMessage("Vote saved. It will sync when possible.");
                                void outbox.enqueue({
                                    entityId: thread.id,
                                    entityType: "chika_thread",
                                    operationType: "chika_thread_reaction",
                                    payload: {
                                      threadId: thread.id,
                                      type:
                                        thread.userReaction === "downvote"
                                          ? null
                                          : "downvote",
                                    },
                                  });
                                return;
                              }
                              setActionMessage(
                                chikaActionErrorMessage(
                                  "Could not update your vote.",
                                  error,
                                ),
                              );
                            },
                          },
                        )
                      : undefined
                  }
                >
                  Down
                </MobileButton>
              </View>
            ) : (
              <Text className="text-xs text-muted-foreground">
                Sign in to vote in Chika.
              </Text>
            )}
            {actionMessage ? (
              <Text className="text-xs text-muted-foreground">{actionMessage}</Text>
            ) : null}
          </View>
        </MobileSection>

        <MobileSection title="Replies">
          {canUseChikaActions ? (
            <View className="mb-4 gap-3">
              <PendingSyncPanel
                isSyncing={outbox.isSyncing}
                items={outbox.items}
                message={
                  localCommentDraft.status === "saved"
                    ? "Saved as draft"
                    : outbox.message
                }
                onDiscard={outbox.discard}
                onSyncNow={outbox.syncNow}
              />
              {replyTo ? (
                <Text className="text-xs text-muted-foreground">
                  Replying to {replyTarget?.authorDisplayName || "this comment"}
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
                    variant="secondary"
                    onPress={() =>
                      void localCommentDraft.save({
                        content: commentDraft,
                        parentCommentId: replyTo,
                        threadId: thread.id,
                      })
                    }
                  >
                    Save draft
                  </MobileButton>
                </View>
                {localCommentDraft.draft ? (
                  <View className="flex-1">
                    <MobileButton
                      variant="ghost"
                      onPress={() =>
                        void localCommentDraft.discard().then(() => {
                          setActionMessage("Draft discarded.");
                          setCommentDraft("");
                          setReplyTo(undefined);
                        })
                      }
                    >
                      Discard draft
                    </MobileButton>
                  </View>
                ) : null}
                <View className="flex-1">
                  <MobileButton
                    disabled={
                      createComment.isPending || commentDraft.trim().length === 0
                    }
                    onPress={() => {
                      const content = commentDraft.trim();
                      if (!content || !thread.id) return;
                      if (!requireSignedIn()) return;
                      createComment.mutate(
                        { content, parentCommentId: replyTo },
                        {
                          onError: (error) => {
                            if (canQueueFailedMutation(error)) {
                              void localCommentDraft.save({
                                content,
                                parentCommentId: replyTo,
                                threadId: thread.id,
                              });
                              setActionMessage(
                                chikaActionErrorMessage(
                                  "Could not post reply. Saved as draft.",
                                  error,
                                ),
                              );
                              return;
                            }
                            setActionMessage(
                              chikaActionErrorMessage("Could not post reply.", error),
                            );
                          },
                          onSuccess: () => {
                            void localCommentDraft.clearSubmitted();
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
          ) : (
            <Text className="mb-4 text-sm text-muted-foreground">
              Sign in to reply in Chika.
            </Text>
          )}

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
                  actionsDisabled={commentReaction.isPending}
                  key={comment.id}
                  comment={comment}
                  depth={depth}
                  reportEnabled={canUseChikaActions}
                  onReact={
                    canUseChikaActions
                      ? (commentId, type) =>
                          requireSignedIn()
                            ? commentReaction.mutate(
                                { commentId, type },
                                {
                                  onError: (error) => {
                                    if (canQueueFailedMutation(error)) {
                                      setActionMessage(
                                        "Vote saved. It will sync when possible.",
                                      );
                                      void outbox.enqueue({
                                          entityId: commentId,
                                          entityType: "chika_comment",
                                          operationType: "chika_comment_reaction",
                                          payload: { commentId, type },
                                        });
                                      return;
                                    }
                                    setActionMessage(
                                      chikaActionErrorMessage(
                                        "Could not update your vote.",
                                        error,
                                      ),
                                    );
                                  },
                                },
                              )
                            : undefined
                      : undefined
                  }
                  onReply={canUseChikaActions ? setReplyTo : undefined}
                />
              ))}
            </View>
          ) : null}
        </MobileSection>
      </MobileScrollScreen>
    </>
  );
}

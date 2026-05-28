import { BottomSheet, Host } from "@expo/ui";
import { useAuth, useUser } from "@clerk/expo";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { MediaPostComment } from "@freediving.ph/types";
import { Image } from "expo-image";
import { Keyboard } from "react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";

import {
  useCreateMediaPostCommentMutation,
  useDeleteMediaPostCommentMutation,
  useToggleMediaPostCommentLikeMutation,
} from "@/features/media/hooks/use-media-mutations";
import { useMediaPostCommentsQuery } from "@/features/media/hooks/use-media-post-comments-query";
import { MobileErrorState } from "@/components/shell";
import { LinkedText } from "@/features/shared/links/components/LinkedText";

const relativeTime = (value: string) => {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "";
  const diffSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSeconds < 60) return "now";
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
  }).format(new Date(value));
};

const initialsFor = (name: string) =>
  name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const canDeleteComment = (
  comment: MediaPostComment,
  viewerUserId: string | null | undefined,
) => Boolean(viewerUserId && comment.author.id === viewerUserId);

function MediaPostCommentRow({
  canDelete,
  comment,
  isDeleting,
  isLiking,
  onDelete,
  onLike,
}: {
  canDelete: boolean;
  comment: MediaPostComment;
  isDeleting: boolean;
  isLiking: boolean;
  onDelete?: () => void;
  onLike?: () => void;
}) {
  return (
    <View className="flex-row gap-2.5">
      {comment.author.avatarUrl ? (
        <Image
          accessibilityLabel=""
          cachePolicy="memory-disk"
          className="size-8 rounded-full bg-secondary"
          contentFit="cover"
          source={{ uri: comment.author.avatarUrl }}
          transition={120}
        />
      ) : (
        <View className="size-8 items-center justify-center rounded-full bg-primary/10">
          <Text className="text-[11px] font-semibold text-primary">
            {initialsFor(comment.author.displayName || comment.author.username || "D")}
          </Text>
        </View>
      )}
      <View className="min-w-0 flex-1 border-b border-border/40 pb-3">
        <View className="flex-row items-center gap-2">
          <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
            {comment.author.displayName || comment.author.username || "Diver"}
          </Text>
          <Text className="text-xs text-muted-foreground">{relativeTime(comment.createdAt)}</Text>
        </View>
        <LinkedText className="mt-1 flex-1 text-sm leading-5 text-foreground" text={comment.body} />
        <View className="mt-2 flex-row items-center gap-3">
          <Pressable
            accessibilityLabel={comment.viewerHasLiked ? "Unlike comment" : "Like comment"}
            accessibilityRole="button"
            className="flex-row items-center gap-1 rounded-full bg-secondary/70 px-3 py-1"
            disabled={!onLike || isLiking}
            onPress={onLike}
          >
            <Ionicons
              color="#475569"
              name={comment.viewerHasLiked ? "heart" : "heart-outline"}
              size={14}
            />
            <Text className="text-[11px] font-semibold text-muted-foreground">
              {comment.likeCount > 0 ? comment.likeCount.toLocaleString() : "Like"}
            </Text>
          </Pressable>
          {canDelete ? (
            <Pressable
              accessibilityLabel="Delete comment"
              accessibilityRole="button"
              className="rounded-full bg-secondary/70 px-3 py-1"
              disabled={isDeleting}
              onPress={onDelete}
            >
              <Ionicons color="#475569" name="trash-outline" size={14} />
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export function MediaPostCommentsSheet({
  onClose,
  postId,
  visible,
}: {
  onClose: () => void;
  postId: string | undefined;
  visible: boolean;
}) {
  const { width } = useWindowDimensions();
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const [draft, setDraft] = useState("");

  const commentsQuery = useMediaPostCommentsQuery(postId, { enabled: visible });
  const createComment = useCreateMediaPostCommentMutation(postId);
  const deleteComment = useDeleteMediaPostCommentMutation(postId);
  const likeComment = useToggleMediaPostCommentLikeMutation(postId);

  const comments = commentsQuery.data?.items ?? [];
  const trimmedDraft = draft.trim();
  const canPost = isLoaded && isSignedIn;
  const canSend =
    Boolean(postId) && canPost && trimmedDraft.length > 0 && !createComment.isPending;

  const sheetWidth = Math.min(width - 28, 430);

  const submitComment = () => {
    if (!canSend) return;
    createComment.mutate(trimmedDraft, {
      onSuccess: () => {
        setDraft("");
        Keyboard.dismiss();
      },
    });
  };

  const tryDelete = (comment: MediaPostComment) => {
    if (deleteComment.isPending) return;
    deleteComment.mutate(comment.id);
  };

  const tryLike = (comment: MediaPostComment) => {
    if (likeComment.isPending) return;
    likeComment.mutate(comment);
  };

  const composerPlaceholder = canPost ? "Write a comment..." : "Sign in to comment.";

  return (
    <Host matchContents>
      <BottomSheet
        isPresented={visible}
        onDismiss={onClose}
        snapPoints={[{ fraction: 0.6 }, "full"]}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
          keyboardVerticalOffset={Platform.OS === "ios" ? 16 : 0}
        >
          <View className="max-w-full pt-3" style={{ flex: 1, width: sheetWidth }}>
            <View className="w-full border-b border-slate-900/10 px-4 pb-3">
              <Text className="w-full text-center text-base font-bold text-slate-900">
                Comments
              </Text>
            </View>

            <ScrollView
              className="w-full"
              contentContainerClassName="pb-5 pt-4"
              keyboardShouldPersistTaps="always"
              style={{ flex: 1 }}
            >
              <View className="w-full gap-3">
                {commentsQuery.isLoading ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator color="#0677A8" />
                    <Text className="text-sm text-muted-foreground">Loading</Text>
                  </View>
                ) : null}

                {commentsQuery.error ? (
                  <View className="w-full items-center gap-3 py-3">
                    <MobileErrorState
                      message="Could not load comments."
                      title="Comments unavailable"
                    />
                    <Pressable
                      accessibilityRole="button"
                      className="min-h-10 items-center justify-center rounded-full bg-secondary/90 px-4"
                      onPress={() => void commentsQuery.refetch()}
                    >
                      <Text className="text-sm font-bold text-slate-900">Try again</Text>
                    </Pressable>
                  </View>
                ) : null}

                {!commentsQuery.isLoading && !commentsQuery.error && comments.length === 0 ? (
                  <View className="w-full gap-2 px-4 py-6">
                    <Text className="text-base font-semibold text-foreground">No comments yet</Text>
                    <Text className="text-sm leading-6 text-muted-foreground">
                      Be the first to comment on this post.
                    </Text>
                  </View>
                ) : null}

                {!commentsQuery.isLoading && !commentsQuery.error
                  ? comments.map((comment) => {
                      const canDelete = canDeleteComment(comment, user?.id);
                      return (
                        <View key={comment.id} className="w-full">
                          <MediaPostCommentRow
                            canDelete={canDelete}
                            comment={comment}
                            isDeleting={deleteComment.isPending}
                            isLiking={likeComment.isPending}
                            onDelete={canDelete ? () => tryDelete(comment) : undefined}
                            onLike={tryLike.bind(null, comment)}
                          />
                        </View>
                      );
                    })
                  : null}
              </View>
            </ScrollView>

            <View className="w-full gap-2 pb-3 px-4">
              {!canPost ? (
                <Text className="text-xs text-muted-foreground">
                  {isLoaded ? "Sign in to add your comment." : "Checking your session."}
                </Text>
              ) : null}

              {createComment.error ? (
                <Text className="mb-2 text-xs text-red-600">
                  {createComment.error.message || "Comment could not be posted."}
                </Text>
              ) : null}

              <View className="w-full flex-row items-end rounded-[28px] bg-secondary/85 py-1 pl-4 pr-2">
                <TextInput
                  className="max-h-32 min-h-10 flex-1 py-2.5 pr-3 text-sm leading-5 text-slate-900"
                  editable={!createComment.isPending && canPost}
                  multiline
                  onChangeText={setDraft}
                  placeholder={composerPlaceholder}
                  placeholderTextColor="#64748b"
                  returnKeyType="default"
                  style={{ textAlignVertical: "top" }}
                  value={draft}
                />

                <Pressable
                  accessibilityLabel="Post comment"
                  accessibilityRole="button"
                  className={`size-10 items-center justify-center rounded-full ${
                    canSend ? "bg-primary" : "bg-transparent"
                  }`}
                  disabled={!canSend}
                  onPress={submitComment}
                >
                  {createComment.isPending ? (
                    <ActivityIndicator color="#e2e8f0" size="small" />
                  ) : (
                    <Ionicons
                      color={canSend ? "#ffffff" : "#64748b"}
                      name="send"
                      size={18}
                      style={{ transform: [{ rotate: "-90deg" }] }}
                    />
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </BottomSheet>
    </Host>
  );
}

const styles = StyleSheet.create({
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
});

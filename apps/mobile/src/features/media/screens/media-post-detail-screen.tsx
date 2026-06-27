import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, Share, Text, View } from "react-native";

import type { ProfileMediaItem } from "@freediving.ph/types";

import { UserIdentityRow } from "@/components/social";
import {
  MobileCard,
  MobileEmptyState,
  MobileErrorState,
  MobileLoadingState,
  MobileScrollScreen,
  MobileSection,
} from "@/components/shell";
import {
  MobileFeedActionRow,
  MobileMediaGalleryPreview,
  type MobileViewerMediaItem,
} from "@/features/home-feed/components/mobile-feed-primitives";
import { MediaPostCommentsSheet } from "@/features/media/components/media-post-comments-sheet";
import {
  useToggleMediaPostLikeMutation,
  useToggleMediaPostSaveMutation,
} from "@/features/media/hooks/use-media-mutations";
import { useMediaPostDetailQuery } from "@/features/media/hooks/use-media-post-detail-query";
import { LinkedText } from "@/features/shared/links/components/LinkedText";

const mediaViewerItemsFromPostItems = (
  items: ProfileMediaItem[],
): MobileViewerMediaItem[] =>
  items
    .map((item) => ({
      alt: item.caption ?? item.postCaption ?? null,
      displayUrl: item.previewUrl ?? item.thumbnailUrl ?? item.playbackUrl ?? undefined,
      height: item.height,
      id: item.id,
      previewUrl: item.previewUrl ?? item.thumbnailUrl ?? undefined,
      thumbnailUrl: item.thumbnailUrl ?? undefined,
      viewerUrl:
        item.previewUrl ?? item.thumbnailUrl ?? item.playbackUrl ?? undefined,
      width: item.width,
    }))
    .filter((item) => item.previewUrl || item.viewerUrl);

const formatDate = (value: string | undefined) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

export function MediaPostDetailScreen() {
  const params = useLocalSearchParams<{ postId?: string | string[] }>();
  const postId = Array.isArray(params.postId) ? params.postId[0] : params.postId;
  const { isLoaded, isSignedIn } = useAuth();
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const detailQuery = useMediaPostDetailQuery(postId);
  const likeMutation = useToggleMediaPostLikeMutation(postId);
  const saveMutation = useToggleMediaPostSaveMutation(postId);

  const detail = detailQuery.data?.post;
  const post = detail?.post;
  const author = detail?.author;
  const items = detail?.items ?? [];
  const viewerItems = mediaViewerItemsFromPostItems(items);
  const previewUrl = viewerItems[0]?.previewUrl ?? viewerItems[0]?.viewerUrl;
  const caption =
    post?.postCaption?.trim() ||
    items.find((item) => item.caption?.trim())?.caption?.trim() ||
    "";
  const canonicalUrl =
    author?.username && post?.id
      ? `https://freediving.ph/${author.username}/posts/${post.id}`
      : undefined;

  const requireSignedIn = () => {
    setActionMessage(null);
    if (!isLoaded) {
      setActionMessage("Checking your session. Try again in a moment.");
      return false;
    }
    if (!isSignedIn) {
      setActionMessage("Sign in to use this action.");
      return false;
    }
    return true;
  };

  const sharePost = async () => {
    const message = [caption || "Freediving Philippines media post", canonicalUrl]
      .filter(Boolean)
      .join("\n\n");
    await Share.share({ message });
  };

  return (
    <MobileScrollScreen subtitle="Media post" title="Post">
      <Stack.Screen options={{ title: author?.displayName || "Media post" }} />

      {detailQuery.isLoading ? (
        <MobileLoadingState message="Loading media post." />
      ) : null}

      {detailQuery.error ? (
        <View className="gap-3">
          <MobileErrorState
            message="This media post is unavailable or no longer visible."
            title="Post unavailable"
          />
          <Pressable
            accessibilityLabel="Retry loading media post"
            accessibilityRole="button"
            className="min-h-11 items-center justify-center rounded-full bg-secondary px-4"
            onPress={() => void detailQuery.refetch()}
          >
            <Text className="text-sm font-semibold text-foreground">Try again</Text>
          </Pressable>
        </View>
      ) : null}

      {!detailQuery.isLoading && !detailQuery.error && !detail ? (
        <MobileEmptyState
          description="The post could not be found."
          title="No post to show"
        />
      ) : null}

      {detail && post && author ? (
        <View className="gap-4">
          <MobileSection>
            <MobileCard>
              <View className="gap-4">
                <UserIdentityRow
                  avatarUrl={author.avatarUrl ?? undefined}
                  displayName={author.displayName || author.username}
                  locationText={formatDate(post.createdAt)}
                  showLocation={Boolean(post.createdAt)}
                  username={author.username}
                />

                {caption ? (
                  <LinkedText
                    className="text-sm leading-6 text-foreground"
                    text={caption}
                  />
                ) : null}

                {previewUrl ? (
                  <MobileMediaGalleryPreview
                    accessibilityLabel={caption || "Media post"}
                    items={viewerItems}
                    previewUrl={previewUrl}
                    showMultipleBadge={viewerItems.length > 1}
                  />
                ) : (
                  <View className="min-h-52 items-center justify-center gap-2 rounded-2xl bg-secondary">
                    <Ionicons color="#64748b" name="image-outline" size={24} />
                    <Text className="text-sm text-muted-foreground">
                      Media preview unavailable.
                    </Text>
                  </View>
                )}

                {actionMessage ? (
                  <Text className="text-sm text-muted-foreground">
                    {actionMessage}
                  </Text>
                ) : null}

                {likeMutation.error || saveMutation.error ? (
                  <Text className="text-sm text-red-600">
                    Could not update this post. Try again.
                  </Text>
                ) : null}

                <MobileFeedActionRow
                  actions={[
                    {
                      accessibilityLabel: post.viewerHasLiked
                        ? "Unlike media post"
                        : "Like media post",
                      active: post.viewerHasLiked,
                      count: post.likeCount,
                      disabled: likeMutation.isPending,
                      icon: post.viewerHasLiked ? "fish" : "fish-outline",
                      label: "Fish",
                      onPress: () => {
                        if (!requireSignedIn()) return;
                        likeMutation.mutate(post.viewerHasLiked);
                      },
                    },
                    {
                      accessibilityLabel: "Open media comments",
                      count: post.commentCount,
                      icon: "chatbubble-outline",
                      label: "Comments",
                      onPress: () => setCommentsOpen(true),
                    },
                    {
                      accessibilityLabel: post.viewerHasSaved
                        ? "Unsave media post"
                        : "Save media post",
                      active: post.viewerHasSaved,
                      disabled: saveMutation.isPending,
                      icon: post.viewerHasSaved ? "bookmark" : "bookmark-outline",
                      label: post.viewerHasSaved ? "Saved" : "Save",
                      onPress: () => {
                        if (!requireSignedIn()) return;
                        saveMutation.mutate(post.viewerHasSaved);
                      },
                    },
                    {
                      accessibilityLabel: "Share media post",
                      icon: "share-outline",
                      label: "Share",
                      onPress: () => void sharePost(),
                    },
                  ]}
                />

                {likeMutation.isPending || saveMutation.isPending ? (
                  <View className="flex-row items-center gap-2 px-3">
                    <ActivityIndicator color="#64748b" size="small" />
                    <Text className="text-xs text-muted-foreground">
                      Updating post
                    </Text>
                  </View>
                ) : null}
              </View>
            </MobileCard>
          </MobileSection>

          <MobileSection title="Comments">
            <Pressable
              accessibilityLabel="Open media comments"
              accessibilityRole="button"
              className="min-h-12 flex-row items-center justify-between rounded-2xl border border-border bg-card px-4"
              onPress={() => setCommentsOpen(true)}
            >
              <Text className="text-sm font-semibold text-foreground">
                {post.commentCount.toLocaleString()} comments
              </Text>
              <Ionicons color="#475569" name="chevron-forward" size={18} />
            </Pressable>
          </MobileSection>
        </View>
      ) : null}

      <MediaPostCommentsSheet
        onClose={() => setCommentsOpen(false)}
        postId={postId}
        visible={commentsOpen}
      />
    </MobileScrollScreen>
  );
}

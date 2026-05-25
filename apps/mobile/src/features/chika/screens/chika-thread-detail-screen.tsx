import { Stack, useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";

import {
  MobileEmptyState,
  MobileErrorState,
  MobileLoadingState,
  MobileScrollScreen,
  MobileSection,
} from "@/components/shell";
import { MobileButton } from "@/components/ui/mobile-button";
import { ChikaCommentCard } from "@/features/chika/components/chika-comment-card";
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
          </View>
        </MobileSection>

        <MobileSection title="Replies">
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
              {comments.map((comment) => (
                <ChikaCommentCard key={comment.id} comment={comment} />
              ))}
            </View>
          ) : null}
        </MobileSection>
      </MobileScrollScreen>
    </>
  );
}

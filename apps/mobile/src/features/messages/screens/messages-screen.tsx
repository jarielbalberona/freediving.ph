import { Link } from "expo-router";
import type { Href } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import type { MessagingThreadCategory, MessagingThreadSummary } from "@freediving.ph/types";

import {
  MobileEmptyState,
  MobileErrorState,
  MobileLoadingState,
  MobileScrollScreen,
  MobileSection,
} from "@/components/shell";
import { MobileButton } from "@/components/ui/mobile-button";
import { useMessageThreadsQuery } from "@/features/messages/hooks/use-message-queries";

const categories: MessagingThreadCategory[] = ["primary", "requests"];

const categoryLabel = (category: MessagingThreadCategory) =>
  category === "primary"
    ? "Chats"
    : category === "requests"
      ? "Requests"
      : "Transactions";

function ThreadRow({ thread }: { thread: MessagingThreadSummary }) {
  const lastMessage = thread.lastMessage?.body;

  return (
    <Link
      href={
        {
          pathname: "/(app)/(tabs)/messages/[threadId]",
          params: { threadId: thread.id },
        } as unknown as Href
      }
      asChild
    >
      <Pressable
        accessibilityRole="link"
        className="rounded-2xl border border-border bg-card p-4"
      >
        <View className="gap-2">
          <View className="flex-row items-start justify-between gap-3">
            <Text className="min-w-0 flex-1 text-base font-semibold text-foreground">
              {thread.participant.displayName || thread.participant.username}
            </Text>
            {thread.hasUnread ? (
              <Text className="rounded-full bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground">
                {thread.unreadCount}
              </Text>
            ) : null}
          </View>
          {lastMessage ? (
            <Text className="text-sm leading-6 text-muted-foreground" numberOfLines={2}>
              {lastMessage}
            </Text>
          ) : null}
          {thread.activeRequest ? (
            <Text className="text-xs font-medium text-primary">Message request</Text>
          ) : null}
        </View>
      </Pressable>
    </Link>
  );
}

export function MessagesScreen() {
  const [category, setCategory] = useState<MessagingThreadCategory>("primary");
  const threadsQuery = useMessageThreadsQuery(category);
  const threads = threadsQuery.data?.items ?? [];

  return (
    <MobileScrollScreen subtitle="Conversations" title="Messages">
      <MobileSection title="Inbox">
        <View className="mb-3 flex-row flex-wrap gap-2">
          {categories.map((item) => (
            <MobileButton
              key={item}
              variant={item === category ? "primary" : "secondary"}
              onPress={() => setCategory(item)}
            >
              {categoryLabel(item)}
            </MobileButton>
          ))}
        </View>

        {threadsQuery.isLoading ? (
          <MobileLoadingState message="Loading messages." />
        ) : null}

        {threadsQuery.error ? (
          <View className="gap-3">
            <MobileErrorState
              message="Messages are taking longer than expected to load."
              title="Messages unavailable"
            />
            <MobileButton variant="secondary" onPress={() => void threadsQuery.refetch()}>
              Try again
            </MobileButton>
          </View>
        ) : null}

        {!threadsQuery.isLoading && !threadsQuery.error && threads.length === 0 ? (
          <MobileEmptyState
            description={
              category === "requests"
                ? "New message requests will appear here."
                : "Your conversations will appear here."
            }
            title={category === "requests" ? "No requests" : "No messages"}
          />
        ) : null}

        {!threadsQuery.isLoading && !threadsQuery.error && threads.length > 0 ? (
          <View className="gap-3">
            {threads.map((thread) => (
              <ThreadRow key={thread.id} thread={thread} />
            ))}
          </View>
        ) : null}
      </MobileSection>
    </MobileScrollScreen>
  );
}

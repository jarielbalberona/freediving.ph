import { Link } from "expo-router";
import type { Href } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import type { MessagingThreadCategory, MessagingThreadSummary } from "@freediving.ph/types";

import { SocialListRow, StatusPill } from "@/components/social";
import {
  MobileEmptyState,
  MobileErrorState,
  MobileLoadingState,
  MobileScrollScreen,
  MobileSection,
} from "@/components/shell";
import { MobileButton } from "@/components/ui/mobile-button";
import { useMessageThreadsQuery } from "@/features/messages/hooks/use-message-queries";

const categories: MessagingThreadCategory[] = [
  "primary",
  "requests",
  "transactions",
];

const categoryLabel = (category: MessagingThreadCategory) =>
  category === "primary"
    ? "Chats"
    : category === "requests"
      ? "Requests"
      : "Transactions";

function ThreadRow({ thread }: { thread: MessagingThreadSummary }) {
  const lastMessage = thread.lastMessage?.body;
  const name = thread.participant.displayName || thread.participant.username;

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
      <Pressable accessibilityRole="link">
        <SocialListRow
          body={lastMessage}
          meta={[thread.activeRequest ? "Message request" : undefined]}
          name={name}
          status={
            thread.hasUnread ? (
              <StatusPill tone="primary">{thread.unreadCount}</StatusPill>
            ) : null
          }
        />
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
                : category === "transactions"
                  ? "Booking and transaction conversations will appear here."
                : "Your conversations will appear here."
            }
            title={
              category === "requests"
                ? "No requests"
                : category === "transactions"
                  ? "No booking messages"
                  : "No messages"
            }
          />
        ) : null}

        {!threadsQuery.isLoading && !threadsQuery.error && threads.length > 0 ? (
          <View>
            {threads.map((thread) => (
              <ThreadRow key={thread.id} thread={thread} />
            ))}
          </View>
        ) : null}
      </MobileSection>
    </MobileScrollScreen>
  );
}

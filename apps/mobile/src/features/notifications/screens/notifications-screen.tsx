import { Text, View } from "react-native";

import {
  MobileEmptyState,
  MobileErrorState,
  MobileLoadingState,
  MobileScrollScreen,
  MobileSection,
} from "@/components/shell";
import { MobileButton } from "@/components/ui/mobile-button";
import { NotificationCard } from "@/features/notifications/components/notification-card";
import { useNotificationsQuery } from "@/features/notifications/hooks/use-notifications-query";

export function NotificationsScreen() {
  const notificationsQuery = useNotificationsQuery();
  const notifications = notificationsQuery.data?.items ?? [];
  const unreadCount = notifications.filter(
    (notification) => notification.status === "UNREAD",
  ).length;

  return (
    <MobileScrollScreen subtitle="Community updates" title="Notifications">
      <MobileSection
        description="Updates from events, Chika, buddies, and your profile appear here."
        title="Latest notifications"
      >
        {notificationsQuery.isLoading ? (
          <MobileLoadingState message="Loading notifications." />
        ) : null}

        {notificationsQuery.error ? (
          <View className="gap-3">
            <MobileErrorState
              message="Notifications are taking longer than expected to load."
              title="Notifications unavailable"
            />
            <MobileButton
              variant="secondary"
              onPress={() => void notificationsQuery.refetch()}
            >
              Try again
            </MobileButton>
          </View>
        ) : null}

        {!notificationsQuery.isLoading &&
        !notificationsQuery.error &&
        notifications.length === 0 ? (
          <MobileEmptyState
            description="No notifications yet. Updates from events, Chika, buddies, and your profile will appear here."
            title="No notifications yet"
          />
        ) : null}

        {!notificationsQuery.isLoading &&
        !notificationsQuery.error &&
        notifications.length > 0 ? (
          <View className="gap-3">
            {unreadCount > 0 ? (
              <View className="rounded-2xl border border-border bg-card p-4">
                <Text className="text-sm font-semibold text-foreground">
                  {unreadCount} unread notification{unreadCount === 1 ? "" : "s"}
                </Text>
                <Text className="mt-1 text-sm leading-6 text-muted-foreground">
                  Open each update when you are ready. Mobile read actions are coming later.
                </Text>
              </View>
            ) : null}

            {notifications.map((notification) => (
              <NotificationCard notification={notification} key={notification.id} />
            ))}
          </View>
        ) : null}
      </MobileSection>
    </MobileScrollScreen>
  );
}

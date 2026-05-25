import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

import type { Notification } from "@freediving.ph/types";

import { MobileCard } from "@/components/shell";
import {
  formatNotificationDate,
  notificationHref,
  notificationMessage,
  notificationTitle,
  notificationTypeLabel,
  priorityLabel,
} from "@/features/notifications/lib/notification-format";

type NotificationCardProps = {
  notification: Notification;
};

function NotificationCardContent({ notification }: NotificationCardProps) {
  const isUnread = notification.status === "UNREAD";
  const createdAt = formatNotificationDate(notification.createdAt);

  return (
    <MobileCard>
      <View className="gap-3">
        <View className="flex-row items-start gap-3">
          <View
            className={`mt-2 h-2 w-2 rounded-full ${
              isUnread ? "bg-primary" : "bg-muted-foreground"
            }`}
          />
          <View className="min-w-0 flex-1 gap-2">
            <View className="flex-row flex-wrap items-center gap-2">
              <Text className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                {notificationTypeLabel(notification.type)}
              </Text>
              <Text className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                {priorityLabel(notification.priority)}
              </Text>
              {isUnread ? (
                <Text className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  New
                </Text>
              ) : null}
            </View>

            <Text className="text-base font-semibold leading-6 text-foreground">
              {notificationTitle(notification)}
            </Text>
            <Text className="text-sm leading-6 text-muted-foreground" numberOfLines={4}>
              {notificationMessage(notification)}
            </Text>
            {createdAt ? (
              <Text className="text-xs text-muted-foreground">{createdAt}</Text>
            ) : null}
          </View>
        </View>
      </View>
    </MobileCard>
  );
}

export function NotificationCard({ notification }: NotificationCardProps) {
  const href = notificationHref(notification);

  if (!href) {
    return <NotificationCardContent notification={notification} />;
  }

  return (
    <Link href={href} asChild>
      <Pressable accessibilityRole="link">
        <NotificationCardContent notification={notification} />
      </Pressable>
    </Link>
  );
}

import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

import type { Notification } from "@freediving.ph/types";

import { SocialListRow, StatusPill } from "@/components/social";
import {
  formatNotificationDate,
  notificationHref,
  notificationMessage,
  notificationTitle,
  notificationTypeLabel,
  priorityLabel,
} from "@/features/notifications/lib/notification-format";

type NotificationCardProps = {
  isDeleting?: boolean;
  isMarkingRead?: boolean;
  notification: Notification;
  onDelete?: (notificationId: number) => void;
  onMarkRead?: (notificationId: number) => void;
};

function NotificationCardContent({ notification }: NotificationCardProps) {
  const isUnread = notification.status === "UNREAD";
  const createdAt = formatNotificationDate(notification.createdAt);

  return (
    <SocialListRow
      body={notificationMessage(notification)}
      meta={[
        notificationTypeLabel(notification.type),
        priorityLabel(notification.priority),
        createdAt,
      ]}
      name="Notification"
      status={isUnread ? <StatusPill tone="primary">New</StatusPill> : null}
      title={notificationTitle(notification)}
    />
  );
}

export function NotificationCard({ notification }: NotificationCardProps) {
  const href = notificationHref(notification);

  if (!href) {
    return <NotificationCardContent notification={notification} />;
  }

  return (
    <Link href={href} asChild>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`Open ${notificationTitle(notification)} notification`}
        className="active:opacity-80"
        style={({ pressed }) => ({
          opacity: pressed ? 0.9 : 1,
          transform: pressed ? [{ scale: 0.985 }] : [],
        })}
      >
        <NotificationCardContent notification={notification} />
      </Pressable>
    </Link>
  );
}

export function ManageableNotificationCard({
  isDeleting = false,
  isMarkingRead = false,
  notification,
  onDelete,
  onMarkRead,
}: NotificationCardProps) {
  const href = notificationHref(notification);
  const isUnread = notification.status === "UNREAD";

  return (
    <View className="gap-2">
      {href ? (
        <Link href={href} asChild>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`Open ${notificationTitle(notification)} notification`}
            className="active:opacity-80"
          >
            <NotificationCardContent notification={notification} />
          </Pressable>
        </Link>
      ) : (
        <NotificationCardContent notification={notification} />
      )}
      <View className="flex-row flex-wrap gap-2 px-1">
        {isUnread ? (
          <Pressable
            accessibilityLabel="Mark notification read"
            accessibilityRole="button"
            className="min-h-9 items-center justify-center rounded-full bg-secondary px-3"
            disabled={isMarkingRead}
            onPress={() => onMarkRead?.(notification.id)}
          >
            <Text className="text-xs font-semibold text-foreground">
              Mark read
            </Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityLabel="Delete notification"
          accessibilityRole="button"
          className="min-h-9 items-center justify-center rounded-full bg-secondary px-3"
          disabled={isDeleting}
          onPress={() => onDelete?.(notification.id)}
        >
          <Text className="text-xs font-semibold text-foreground">Delete</Text>
        </Pressable>
      </View>
    </View>
  );
}

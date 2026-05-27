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
  notification: Notification;
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
      <Pressable accessibilityRole="link">
        <NotificationCardContent notification={notification} />
      </Pressable>
    </Link>
  );
}

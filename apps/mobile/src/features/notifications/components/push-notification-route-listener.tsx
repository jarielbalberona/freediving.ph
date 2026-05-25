import { useRouter } from "expo-router";
import { useEffect } from "react";

import {
  notificationHrefFromActionUrl,
  notificationsFallbackHref,
} from "@/features/notifications/lib/notification-format";
import { Notifications } from "@/features/notifications/lib/push-notifications";

const actionUrlFromData = (data: Record<string, unknown>) => {
  const value = data.actionUrl ?? data.url ?? data.href;
  return typeof value === "string" ? value : undefined;
};

export function PushNotificationRouteListener() {
  const router = useRouter();

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data ?? {};
        const href =
          notificationHrefFromActionUrl(actionUrlFromData(data)) ??
          notificationsFallbackHref;
        router.push(href);
      },
    );

    return () => {
      subscription.remove();
    };
  }, [router]);

  return null;
}

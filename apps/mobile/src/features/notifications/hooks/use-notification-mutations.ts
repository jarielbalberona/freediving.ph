import { useAuth } from "@clerk/expo";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { ListNotificationsResponse, Notification } from "@freediving.ph/types";

import {
  deleteNotification,
  markNotificationRead,
} from "@/features/notifications/api/notifications-api";
import { FphgoApiError } from "@/lib/api";
import { mobileQueryKeys } from "@/lib/query";

const useRequiredToken = () => {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  return async () => {
    if (!isLoaded) {
      throw new FphgoApiError(401, "Checking your session. Try again in a moment.", null);
    }
    if (!isSignedIn) {
      throw new FphgoApiError(401, "Sign in to continue.", null);
    }
    const token = await getToken();
    if (!token) throw new FphgoApiError(401, "Sign in to continue.", null);
    return token;
  };
};

const patchNotification = (
  current: ListNotificationsResponse | undefined,
  notification: Notification,
) =>
  current
    ? {
        ...current,
        items: current.items.map((item) =>
          item.id === notification.id ? notification : item,
        ),
      }
    : current;

const removeNotification = (
  current: ListNotificationsResponse | undefined,
  notificationId: number,
) =>
  current
    ? {
        ...current,
        items: current.items.filter((item) => item.id !== notificationId),
      }
    : current;

export const useMarkNotificationReadMutation = () => {
  const getRequiredToken = useRequiredToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: number) =>
      markNotificationRead(notificationId, await getRequiredToken()),
    onSuccess: (notification) => {
      queryClient.setQueriesData<ListNotificationsResponse>(
        { queryKey: mobileQueryKeys.notifications.all },
        (current) => patchNotification(current, notification),
      );
      queryClient.invalidateQueries({
        queryKey: mobileQueryKeys.notifications.unreadCount(),
      });
    },
  });
};

export const useDeleteNotificationMutation = () => {
  const getRequiredToken = useRequiredToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: number) => {
      await deleteNotification(notificationId, await getRequiredToken());
      return notificationId;
    },
    onSuccess: (notificationId) => {
      queryClient.setQueriesData<ListNotificationsResponse>(
        { queryKey: mobileQueryKeys.notifications.all },
        (current) => removeNotification(current, notificationId),
      );
      queryClient.invalidateQueries({
        queryKey: mobileQueryKeys.notifications.unreadCount(),
      });
    },
  });
};

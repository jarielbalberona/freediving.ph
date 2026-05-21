import { useQuery } from "@tanstack/react-query";
import { notificationsApi } from "../api/notifications";
import type { NotificationFilters } from "@freediving.ph/types";
import { queryKeys } from "@/lib/query/query-keys";

export const useNotifications = (filters?: NotificationFilters) => {
  return useQuery({
    queryKey: queryKeys.notifications.list(
      filters as Record<string, unknown> | undefined,
    ),
    queryFn: () => notificationsApi.getNotifications(filters),
    staleTime: 5 * 60 * 1000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

export const useNotification = (notificationId: number) => {
  return useQuery({
    queryKey: queryKeys.notifications.detail(notificationId),
    queryFn: () => notificationsApi.getNotificationById(notificationId),
    enabled: Number.isInteger(notificationId) && notificationId > 0,
    staleTime: 5 * 60 * 1000,
  });
};

export const useNotificationSettings = () => {
  return useQuery({
    queryKey: queryKeys.notifications.settings(),
    queryFn: () => notificationsApi.getNotificationSettings(),
    staleTime: 10 * 60 * 1000,
  });
};

export const useNotificationStats = () => {
  return useQuery({
    queryKey: queryKeys.notifications.stats(),
    queryFn: () => notificationsApi.getNotificationStats(),
    staleTime: 2 * 60 * 1000,
  });
};

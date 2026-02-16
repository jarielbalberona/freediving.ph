import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from '../api/notifications';
import type { NotificationFilters } from '@freediving.ph/types';

export const useNotifications = (userId: number, filters?: NotificationFilters) => {
  return useQuery({
    queryKey: ['notifications', userId, filters],
    queryFn: () => notificationsApi.getUserNotifications(userId, filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

export const useNotification = (userId: number, notificationId: number) => {
  return useQuery({
    queryKey: ['notification', userId, notificationId],
    queryFn: () => notificationsApi.getNotificationById(userId, notificationId),
    enabled: !!notificationId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useNotificationSettings = (userId: number) => {
  return useQuery({
    queryKey: ['notification-settings', userId],
    queryFn: () => notificationsApi.getNotificationSettings(userId),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useNotificationStats = (userId: number) => {
  return useQuery({
    queryKey: ['notification-stats', userId],
    queryFn: () => notificationsApi.getNotificationStats(userId),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

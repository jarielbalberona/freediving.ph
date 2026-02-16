import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '../api/notifications';
import type {
  CreateNotificationRequest,
  UpdateNotificationRequest,
  UpdateNotificationSettingsRequest
} from '@freediving.ph/types';

export const useCreateNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateNotificationRequest) =>
      notificationsApi.createNotification(data),
    onSuccess: (response, variables) => {
      // Invalidate notifications for the user
      queryClient.invalidateQueries({
        queryKey: ['notifications', variables.userId]
      });
      // Invalidate stats
      queryClient.invalidateQueries({
        queryKey: ['notification-stats', variables.userId]
      });
    },
  });
};

export const useUpdateNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      notificationId,
      data
    }: {
      userId: number;
      notificationId: number;
      data: UpdateNotificationRequest
    }) =>
      notificationsApi.updateNotification(userId, notificationId, data),
    onSuccess: (response, variables) => {
      // Invalidate specific notification
      queryClient.invalidateQueries({
        queryKey: ['notification', variables.userId, variables.notificationId]
      });
      // Invalidate notifications list
      queryClient.invalidateQueries({
        queryKey: ['notifications', variables.userId]
      });
      // Invalidate stats
      queryClient.invalidateQueries({
        queryKey: ['notification-stats', variables.userId]
      });
    },
  });
};

export const useMarkAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, notificationId }: { userId: number; notificationId: number }) =>
      notificationsApi.markAsRead(userId, notificationId),
    onSuccess: (response, variables) => {
      // Optimistically update the notification
      queryClient.setQueryData(
        ['notification', variables.userId, variables.notificationId],
        (old: any) => old ? { ...old, data: { ...old.data, status: 'READ', readAt: new Date().toISOString() } } : old
      );
      // Invalidate notifications list
      queryClient.invalidateQueries({
        queryKey: ['notifications', variables.userId]
      });
      // Invalidate stats
      queryClient.invalidateQueries({
        queryKey: ['notification-stats', variables.userId]
      });
    },
  });
};

export const useMarkAllAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: number) =>
      notificationsApi.markAllAsRead(userId),
    onSuccess: (response, variables) => {
      // Invalidate all notifications for the user
      queryClient.invalidateQueries({
        queryKey: ['notifications', variables]
      });
      // Invalidate stats
      queryClient.invalidateQueries({
        queryKey: ['notification-stats', variables]
      });
    },
  });
};

export const useDeleteNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, notificationId }: { userId: number; notificationId: number }) =>
      notificationsApi.deleteNotification(userId, notificationId),
    onSuccess: (response, variables) => {
      // Remove from cache
      queryClient.removeQueries({
        queryKey: ['notification', variables.userId, variables.notificationId]
      });
      // Invalidate notifications list
      queryClient.invalidateQueries({
        queryKey: ['notifications', variables.userId]
      });
      // Invalidate stats
      queryClient.invalidateQueries({
        queryKey: ['notification-stats', variables.userId]
      });
    },
  });
};

export const useUpdateNotificationSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, data }: { userId: number; data: UpdateNotificationSettingsRequest }) =>
      notificationsApi.updateNotificationSettings(userId, data),
    onSuccess: (response, variables) => {
      // Invalidate settings
      queryClient.invalidateQueries({
        queryKey: ['notification-settings', variables.userId]
      });
    },
  });
};

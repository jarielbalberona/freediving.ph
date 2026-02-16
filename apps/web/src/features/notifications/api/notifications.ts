import { axiosInstance } from '@/lib/http/axios';
import type { ApiEnvelope } from '@freediving.ph/types';
import type {
  Notification,
  NotificationSettings,
  NotificationStats,
  CreateNotificationRequest,
  UpdateNotificationRequest,
  UpdateNotificationSettingsRequest,
  NotificationFilters
} from '../types';

export const notificationsApi = {
  getUserNotifications: async (userId: number, filters?: NotificationFilters): Promise<Notification[]> => {
    const response = await axiosInstance.get<ApiEnvelope<Array<{ notification: Notification }>>>(`/notifications/users/${userId}`);
    let notifications = response.data.data.map((item) => item.notification);

    if (filters?.status) {
      notifications = notifications.filter((n) => n.status === filters.status);
    }
    if (filters?.type) {
      notifications = notifications.filter((n) => n.type === filters.type);
    }
    if (filters?.priority) {
      notifications = notifications.filter((n) => n.priority === filters.priority);
    }

    return notifications;
  },

  getNotificationById: async (_userId: number, notificationId: number): Promise<Notification> => {
    const response = await axiosInstance.get<ApiEnvelope<Notification>>(`/notifications/${notificationId}`);
    return response.data.data;
  },

  createNotification: async (data: CreateNotificationRequest): Promise<Notification> => {
    const response = await axiosInstance.post<ApiEnvelope<Notification>>('/notifications', data);
    return response.data.data;
  },

  updateNotification: async (_userId: number, notificationId: number, data: UpdateNotificationRequest): Promise<Notification> => {
    const response = await axiosInstance.put<ApiEnvelope<Notification>>(`/notifications/${notificationId}`, data);
    return response.data.data;
  },

  markAsRead: async (_userId: number, notificationId: number): Promise<Notification> => {
    const response = await axiosInstance.post<ApiEnvelope<Notification>>(`/notifications/${notificationId}/mark-read`);
    return response.data.data;
  },

  markAllAsRead: async (userId: number): Promise<{ count: number }> => {
    const response = await axiosInstance.post<ApiEnvelope<{ count: number }>>(`/notifications/users/${userId}/mark-all-read`);
    return response.data.data;
  },

  deleteNotification: async (_userId: number, notificationId: number): Promise<void> => {
    await axiosInstance.delete(`/notifications/${notificationId}`);
  },

  getNotificationSettings: async (userId: number): Promise<NotificationSettings> => {
    const response = await axiosInstance.get<ApiEnvelope<NotificationSettings>>(`/notifications/users/${userId}/settings`);
    return response.data.data;
  },

  updateNotificationSettings: async (userId: number, data: UpdateNotificationSettingsRequest): Promise<NotificationSettings> => {
    const response = await axiosInstance.put<ApiEnvelope<NotificationSettings>>(`/notifications/users/${userId}/settings`, data);
    return response.data.data;
  },

  getNotificationStats: async (userId: number): Promise<NotificationStats> => {
    const notifications = await notificationsApi.getUserNotifications(userId);
    return {
      total: notifications.length,
      unread: notifications.filter((n) => n.status === 'UNREAD').length,
      read: notifications.filter((n) => n.status === 'READ').length,
      archived: notifications.filter((n) => n.status === 'ARCHIVED').length,
    };
  },
};

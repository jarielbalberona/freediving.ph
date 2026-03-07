import { axiosInstance } from '@/lib/http/axios';
import type {
  Notification,
  NotificationSettings,
  NotificationStats,
  CreateNotificationRequest,
  UpdateNotificationSettingsRequest,
  NotificationFilters
} from '@freediving.ph/types';

type NotificationListResponse = {
  items: Notification[];
  pagination: {
    limit: number;
    offset: number;
  };
};

export const notificationsApi = {
  getNotifications: async (filters?: NotificationFilters): Promise<Notification[]> => {
    const limit = filters?.limit ?? 20;
    const offset =
      typeof filters?.offset === 'number'
        ? filters.offset
        : typeof filters?.page === 'number' && typeof filters?.limit === 'number'
          ? Math.max(0, (filters.page - 1) * filters.limit)
          : 0;

    const response = await axiosInstance.get<NotificationListResponse>('/v1/notifications', {
      params: {
        limit,
        offset,
        status: filters?.status,
        type: filters?.type,
        priority: filters?.priority,
      },
    });

    return response.data.items;
  },

  getNotificationById: async (notificationId: number): Promise<Notification> => {
    const response = await axiosInstance.get<Notification>(`/v1/notifications/${notificationId}`);
    return response.data;
  },

  createNotification: async (data: CreateNotificationRequest): Promise<Notification> => {
    const response = await axiosInstance.post<Notification>('/v1/notifications', data);
    return response.data;
  },

  markAsRead: async (notificationId: number): Promise<Notification> => {
    const response = await axiosInstance.post<Notification>(`/v1/notifications/${notificationId}/read`);
    return response.data;
  },

  markAllAsRead: async (): Promise<{ count: number }> => {
    const response = await axiosInstance.post<{ count: number }>('/v1/notifications/read-all');
    return response.data;
  },

  deleteNotification: async (notificationId: number): Promise<void> => {
    await axiosInstance.delete(`/v1/notifications/${notificationId}`);
  },

  getNotificationSettings: async (): Promise<NotificationSettings> => {
    const response = await axiosInstance.get<NotificationSettings>('/v1/notifications/settings');
    return response.data;
  },

  updateNotificationSettings: async (data: UpdateNotificationSettingsRequest): Promise<NotificationSettings> => {
    const response = await axiosInstance.put<NotificationSettings>('/v1/notifications/settings', data);
    return response.data;
  },

  getNotificationStats: async (): Promise<NotificationStats> => {
    const response = await axiosInstance.get<NotificationStats>('/v1/notifications/stats');
    return response.data;
  },
};

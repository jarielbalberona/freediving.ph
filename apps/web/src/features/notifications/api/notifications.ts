import { axiosInstance } from '@/lib/http/axios';
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
  // Get user notifications with pagination and filtering
  getUserNotifications: (userId: number, filters?: NotificationFilters) => {
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.status) params.append('status', filters.status);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.priority) params.append('priority', filters.priority);

    const queryString = params.toString();
    const url = `/users/${userId}/notifications${queryString ? `?${queryString}` : ''}`;

    return axiosInstance.get<{
      success: boolean;
      data: {
        notifications: Notification[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
          hasNext: boolean;
          hasPrev: boolean;
        };
      };
    }>(url);
  },

  // Get notification by ID
  getNotificationById: (userId: number, notificationId: number) => {
    return axiosInstance.get<{
      success: boolean;
      data: Notification;
    }>(`/users/${userId}/notifications/${notificationId}`);
  },

  // Create new notification
  createNotification: (data: CreateNotificationRequest) => {
    return axiosInstance.post<{
      success: boolean;
      data: Notification;
    }>('/notifications', data);
  },

  // Update notification
  updateNotification: (userId: number, notificationId: number, data: UpdateNotificationRequest) => {
    return axiosInstance.put<{
      success: boolean;
      data: Notification;
    }>(`/users/${userId}/notifications/${notificationId}`, data);
  },

  // Mark notification as read
  markAsRead: (userId: number, notificationId: number) => {
    return axiosInstance.patch<{
      success: boolean;
      data: Notification;
    }>(`/users/${userId}/notifications/${notificationId}/read`);
  },

  // Mark all notifications as read
  markAllAsRead: (userId: number) => {
    return axiosInstance.patch<{
      success: boolean;
      message: string;
    }>(`/users/${userId}/notifications/read-all`);
  },

  // Delete notification
  deleteNotification: (userId: number, notificationId: number) => {
    return axiosInstance.delete<{
      success: boolean;
      message: string;
    }>(`/users/${userId}/notifications/${notificationId}`);
  },

  // Get notification settings
  getNotificationSettings: (userId: number) => {
    return axiosInstance.get<{
      success: boolean;
      data: NotificationSettings;
    }>(`/users/${userId}/notification-settings`);
  },

  // Update notification settings
  updateNotificationSettings: (userId: number, data: UpdateNotificationSettingsRequest) => {
    return axiosInstance.put<{
      success: boolean;
      data: NotificationSettings;
    }>(`/users/${userId}/notification-settings`, data);
  },

  // Get notification statistics
  getNotificationStats: (userId: number) => {
    return axiosInstance.get<{
      success: boolean;
      data: NotificationStats;
    }>(`/users/${userId}/notification-stats`);
  },
};

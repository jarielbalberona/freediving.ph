export interface Notification {
  id: number;
  userId: number;
  type: 'SYSTEM' | 'MESSAGE' | 'EVENT' | 'GROUP' | 'SERVICE' | 'BOOKING' | 'REVIEW' | 'MENTION' | 'LIKE' | 'COMMENT' | 'FRIEND_REQUEST' | 'GROUP_INVITE' | 'EVENT_REMINDER' | 'PAYMENT' | 'SECURITY';
  title: string;
  message: string;
  status: 'UNREAD' | 'READ' | 'ARCHIVED' | 'DELETED';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  relatedUserId?: number;
  relatedEntityType?: string;
  relatedEntityId?: number;
  imageUrl?: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
  isEmailSent: boolean;
  isPushSent: boolean;
  emailSentAt?: string;
  pushSentAt?: string;
  readAt?: string;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationSettings {
  id: number;
  userId: number;
  emailEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  systemNotifications: boolean;
  messageNotifications: boolean;
  eventNotifications: boolean;
  groupNotifications: boolean;
  serviceNotifications: boolean;
  bookingNotifications: boolean;
  reviewNotifications: boolean;
  mentionNotifications: boolean;
  likeNotifications: boolean;
  commentNotifications: boolean;
  friendRequestNotifications: boolean;
  groupInviteNotifications: boolean;
  eventReminderNotifications: boolean;
  paymentNotifications: boolean;
  securityNotifications: boolean;
  digestFrequency: 'IMMEDIATE' | 'DAILY' | 'WEEKLY' | 'NEVER';
  quietHoursStart?: string;
  quietHoursEnd?: string;
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationStats {
  total: number;
  unread: number;
  read: number;
  archived: number;
}

export interface CreateNotificationRequest {
  userId: number;
  type: Notification['type'];
  title: string;
  message: string;
  priority?: Notification['priority'];
  relatedUserId?: number;
  relatedEntityType?: string;
  relatedEntityId?: number;
  imageUrl?: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

export interface UpdateNotificationRequest {
  status?: Notification['status'];
  readAt?: string;
  archivedAt?: string;
}

export interface UpdateNotificationSettingsRequest {
  emailEnabled?: boolean;
  pushEnabled?: boolean;
  inAppEnabled?: boolean;
  systemNotifications?: boolean;
  messageNotifications?: boolean;
  eventNotifications?: boolean;
  groupNotifications?: boolean;
  serviceNotifications?: boolean;
  bookingNotifications?: boolean;
  reviewNotifications?: boolean;
  mentionNotifications?: boolean;
  likeNotifications?: boolean;
  commentNotifications?: boolean;
  friendRequestNotifications?: boolean;
  groupInviteNotifications?: boolean;
  eventReminderNotifications?: boolean;
  paymentNotifications?: boolean;
  securityNotifications?: boolean;
  digestFrequency?: NotificationSettings['digestFrequency'];
  quietHoursStart?: string;
  quietHoursEnd?: string;
  timezone?: string;
}

export interface NotificationFilters {
  page?: number;
  limit?: number;
  status?: Notification['status'];
  type?: Notification['type'];
  priority?: Notification['priority'];
}

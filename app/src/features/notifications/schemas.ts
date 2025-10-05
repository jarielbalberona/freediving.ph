import { z } from 'zod';

export const createNotificationSchema = z.object({
  userId: z.number().int().positive(),
  type: z.enum(['SYSTEM', 'MESSAGE', 'EVENT', 'GROUP', 'SERVICE', 'BOOKING', 'REVIEW', 'MENTION', 'LIKE', 'COMMENT', 'FRIEND_REQUEST', 'GROUP_INVITE', 'EVENT_REMINDER', 'PAYMENT', 'SECURITY']),
  title: z.string().min(1).max(255),
  message: z.string().min(1),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
  relatedUserId: z.number().int().positive().optional(),
  relatedEntityType: z.string().max(50).optional(),
  relatedEntityId: z.number().int().positive().optional(),
  imageUrl: z.string().url().optional(),
  actionUrl: z.string().url().optional(),
  metadata: z.record(z.any()).optional(),
});

export const updateNotificationSchema = z.object({
  status: z.enum(['UNREAD', 'READ', 'ARCHIVED', 'DELETED']).optional(),
  readAt: z.string().datetime().optional(),
  archivedAt: z.string().datetime().optional(),
});

export const updateNotificationSettingsSchema = z.object({
  emailEnabled: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
  inAppEnabled: z.boolean().optional(),
  systemNotifications: z.boolean().optional(),
  messageNotifications: z.boolean().optional(),
  eventNotifications: z.boolean().optional(),
  groupNotifications: z.boolean().optional(),
  serviceNotifications: z.boolean().optional(),
  bookingNotifications: z.boolean().optional(),
  reviewNotifications: z.boolean().optional(),
  mentionNotifications: z.boolean().optional(),
  likeNotifications: z.boolean().optional(),
  commentNotifications: z.boolean().optional(),
  friendRequestNotifications: z.boolean().optional(),
  groupInviteNotifications: z.boolean().optional(),
  eventReminderNotifications: z.boolean().optional(),
  paymentNotifications: z.boolean().optional(),
  securityNotifications: z.boolean().optional(),
  digestFrequency: z.enum(['IMMEDIATE', 'DAILY', 'WEEKLY', 'NEVER']).optional(),
  quietHoursStart: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  quietHoursEnd: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  timezone: z.string().max(50).optional(),
});

export const notificationFiltersSchema = z.object({
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).optional(),
  status: z.enum(['UNREAD', 'READ', 'ARCHIVED', 'DELETED']).optional(),
  type: z.enum(['SYSTEM', 'MESSAGE', 'EVENT', 'GROUP', 'SERVICE', 'BOOKING', 'REVIEW', 'MENTION', 'LIKE', 'COMMENT', 'FRIEND_REQUEST', 'GROUP_INVITE', 'EVENT_REMINDER', 'PAYMENT', 'SECURITY']).optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
});

export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
export type UpdateNotificationInput = z.infer<typeof updateNotificationSchema>;
export type UpdateNotificationSettingsInput = z.infer<typeof updateNotificationSettingsSchema>;
export type NotificationFiltersInput = z.infer<typeof notificationFiltersSchema>;

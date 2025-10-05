import { Request, Response } from "express";
import { db } from "@/databases/drizzle/connection";
import { notifications, notificationSettings, notificationTemplates } from "@/models/drizzle/notifications.model";
import { eq, and, desc, asc, count, sql } from "drizzle-orm";
import { z } from "zod";

// Validation schemas
const createNotificationSchema = z.object({
  userId: z.number().int().positive(),
  type: z.enum(["SYSTEM", "MESSAGE", "EVENT", "GROUP", "SERVICE", "BOOKING", "REVIEW", "MENTION", "LIKE", "COMMENT", "FRIEND_REQUEST", "GROUP_INVITE", "EVENT_REMINDER", "PAYMENT", "SECURITY"]),
  title: z.string().min(1).max(255),
  message: z.string().min(1),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
  relatedUserId: z.number().int().positive().optional(),
  relatedEntityType: z.string().max(50).optional(),
  relatedEntityId: z.number().int().positive().optional(),
  imageUrl: z.string().url().optional(),
  actionUrl: z.string().url().optional(),
  metadata: z.record(z.any()).optional(),
});

const updateNotificationSchema = z.object({
  status: z.enum(["UNREAD", "READ", "ARCHIVED", "DELETED"]).optional(),
  readAt: z.string().datetime().optional(),
  archivedAt: z.string().datetime().optional(),
});

const notificationSettingsSchema = z.object({
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
  digestFrequency: z.enum(["IMMEDIATE", "DAILY", "WEEKLY", "NEVER"]).optional(),
  quietHoursStart: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  quietHoursEnd: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  timezone: z.string().max(50).optional(),
});

// Get user notifications with pagination and filtering
export const getUserNotifications = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const type = req.query.type as string;
    const priority = req.query.priority as string;

    if (isNaN(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const offset = (page - 1) * limit;

    // Build where conditions
    const whereConditions = [eq(notifications.userId, userId)];

    if (status) {
      whereConditions.push(eq(notifications.status, status as any));
    }
    if (type) {
      whereConditions.push(eq(notifications.type, type as any));
    }
    if (priority) {
      whereConditions.push(eq(notifications.priority, priority as any));
    }

    // Get notifications with total count
    const [notificationsList, totalCount] = await Promise.all([
      db
        .select()
        .from(notifications)
        .where(and(...whereConditions))
        .orderBy(desc(notifications.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(notifications)
        .where(and(...whereConditions))
    ]);

    const totalPages = Math.ceil(totalCount[0].count / limit);

    res.json({
      success: true,
      data: {
        notifications: notificationsList,
        pagination: {
          page,
          limit,
          total: totalCount[0].count,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Error getting user notifications:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get notification by ID
export const getNotificationById = async (req: Request, res: Response) => {
  try {
    const notificationId = parseInt(req.params.id);
    const userId = parseInt(req.params.userId);

    if (isNaN(notificationId) || isNaN(userId)) {
      return res.status(400).json({ error: "Invalid notification ID or user ID" });
    }

    const notification = await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
      .limit(1);

    if (notification.length === 0) {
      return res.status(404).json({ error: "Notification not found" });
    }

    res.json({
      success: true,
      data: notification[0],
    });
  } catch (error) {
    console.error("Error getting notification:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Create new notification
export const createNotification = async (req: Request, res: Response) => {
  try {
    const validatedData = createNotificationSchema.parse(req.body);

    const newNotification = await db
      .insert(notifications)
      .values({
        ...validatedData,
        priority: validatedData.priority || "NORMAL",
      })
      .returning();

    res.status(201).json({
      success: true,
      data: newNotification[0],
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    console.error("Error creating notification:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Update notification
export const updateNotification = async (req: Request, res: Response) => {
  try {
    const notificationId = parseInt(req.params.id);
    const userId = parseInt(req.params.userId);

    if (isNaN(notificationId) || isNaN(userId)) {
      return res.status(400).json({ error: "Invalid notification ID or user ID" });
    }

    const validatedData = updateNotificationSchema.parse(req.body);

    const updatedNotification = await db
      .update(notifications)
      .set({
        ...validatedData,
        updatedAt: new Date(),
      })
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
      .returning();

    if (updatedNotification.length === 0) {
      return res.status(404).json({ error: "Notification not found" });
    }

    res.json({
      success: true,
      data: updatedNotification[0],
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    console.error("Error updating notification:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Mark notification as read
export const markAsRead = async (req: Request, res: Response) => {
  try {
    const notificationId = parseInt(req.params.id);
    const userId = parseInt(req.params.userId);

    if (isNaN(notificationId) || isNaN(userId)) {
      return res.status(400).json({ error: "Invalid notification ID or user ID" });
    }

    const updatedNotification = await db
      .update(notifications)
      .set({
        status: "READ",
        readAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
      .returning();

    if (updatedNotification.length === 0) {
      return res.status(404).json({ error: "Notification not found" });
    }

    res.json({
      success: true,
      data: updatedNotification[0],
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Mark all notifications as read
export const markAllAsRead = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);

    if (isNaN(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    await db
      .update(notifications)
      .set({
        status: "READ",
        readAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(notifications.userId, userId), eq(notifications.status, "UNREAD")));

    res.json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Delete notification
export const deleteNotification = async (req: Request, res: Response) => {
  try {
    const notificationId = parseInt(req.params.id);
    const userId = parseInt(req.params.userId);

    if (isNaN(notificationId) || isNaN(userId)) {
      return res.status(400).json({ error: "Invalid notification ID or user ID" });
    }

    const deletedNotification = await db
      .update(notifications)
      .set({
        status: "DELETED",
        updatedAt: new Date(),
      })
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
      .returning();

    if (deletedNotification.length === 0) {
      return res.status(404).json({ error: "Notification not found" });
    }

    res.json({
      success: true,
      message: "Notification deleted",
    });
  } catch (error) {
    console.error("Error deleting notification:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get notification settings
export const getNotificationSettings = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);

    if (isNaN(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const settings = await db
      .select()
      .from(notificationSettings)
      .where(eq(notificationSettings.userId, userId))
      .limit(1);

    if (settings.length === 0) {
      // Create default settings if none exist
      const defaultSettings = await db
        .insert(notificationSettings)
        .values({ userId })
        .returning();

      return res.json({
        success: true,
        data: defaultSettings[0],
      });
    }

    res.json({
      success: true,
      data: settings[0],
    });
  } catch (error) {
    console.error("Error getting notification settings:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Update notification settings
export const updateNotificationSettings = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);

    if (isNaN(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const validatedData = notificationSettingsSchema.parse(req.body);

    // Check if settings exist
    const existingSettings = await db
      .select()
      .from(notificationSettings)
      .where(eq(notificationSettings.userId, userId))
      .limit(1);

    let updatedSettings;

    if (existingSettings.length === 0) {
      // Create new settings
      updatedSettings = await db
        .insert(notificationSettings)
        .values({ userId, ...validatedData })
        .returning();
    } else {
      // Update existing settings
      updatedSettings = await db
        .update(notificationSettings)
        .set({
          ...validatedData,
          updatedAt: new Date(),
        })
        .where(eq(notificationSettings.userId, userId))
        .returning();
    }

    res.json({
      success: true,
      data: updatedSettings[0],
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    console.error("Error updating notification settings:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get notification statistics
export const getNotificationStats = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);

    if (isNaN(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const stats = await db
      .select({
        total: count(),
        unread: sql<number>`count(case when status = 'UNREAD' then 1 end)`,
        read: sql<number>`count(case when status = 'READ' then 1 end)`,
        archived: sql<number>`count(case when status = 'ARCHIVED' then 1 end)`,
      })
      .from(notifications)
      .where(eq(notifications.userId, userId));

    res.json({
      success: true,
      data: stats[0],
    });
  } catch (error) {
    console.error("Error getting notification stats:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

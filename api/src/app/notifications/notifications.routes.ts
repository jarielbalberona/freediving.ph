import { Router } from "express";
import {
  getUserNotifications,
  getNotificationById,
  createNotification,
  updateNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getNotificationSettings,
  updateNotificationSettings,
  getNotificationStats,
} from "./notifications.controller";

const router = Router();

// Notification routes
router.get("/users/:userId/notifications", getUserNotifications);
router.get("/users/:userId/notifications/:id", getNotificationById);
router.post("/notifications", createNotification);
router.put("/users/:userId/notifications/:id", updateNotification);
router.patch("/users/:userId/notifications/:id/read", markAsRead);
router.patch("/users/:userId/notifications/read-all", markAllAsRead);
router.delete("/users/:userId/notifications/:id", deleteNotification);

// Notification settings routes
router.get("/users/:userId/notification-settings", getNotificationSettings);
router.put("/users/:userId/notification-settings", updateNotificationSettings);

// Notification statistics
router.get("/users/:userId/notification-stats", getNotificationStats);

export default router;

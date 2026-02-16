import express, { Router } from "express";
import { clerkAuthMiddleware, requireRole } from "@/middlewares/clerk.middleware";

import NotificationsController from "@/app/notifications/notifications.controller";

export const notificationsRouter: Router = (() => {
	const router = express.Router();

	// Notification CRUD routes
	router
		.route("/")
		.get(clerkAuthMiddleware, (req, res) => {
			new NotificationsController(req, res).getAllNotifications();
		})
		.post(clerkAuthMiddleware, requireRole("ADMINISTRATOR"), async (req, res) => {
			new NotificationsController(req, res).createNotification();
		});

	router
		.route("/:id")
		.get(clerkAuthMiddleware, (req, res) => {
			new NotificationsController(req, res).getNotificationById();
		})
		.put(clerkAuthMiddleware, async (req, res) => {
			new NotificationsController(req, res).updateNotification();
		})
		.delete(clerkAuthMiddleware, async (req, res) => {
			new NotificationsController(req, res).deleteNotification();
		});

	// User notification routes
	router.get("/users/:userId", clerkAuthMiddleware, (req, res) => {
		new NotificationsController(req, res).getUserNotifications();
	});

	router.post("/users/:userId/mark-all-read", clerkAuthMiddleware, async (req, res) => {
		new NotificationsController(req, res).markAllAsRead();
	});

	router.get("/users/:userId/unread-count", clerkAuthMiddleware, (req, res) => {
		new NotificationsController(req, res).getUnreadCount();
	});

	// Notification actions
	router.post("/:id/mark-read", clerkAuthMiddleware, async (req, res) => {
		new NotificationsController(req, res).markAsRead();
	});

	// Notification settings routes
	router
		.route("/users/:userId/settings")
		.get(clerkAuthMiddleware, (req, res) => {
			new NotificationsController(req, res).getNotificationSettings();
		})
		.put(clerkAuthMiddleware, async (req, res) => {
			new NotificationsController(req, res).updateNotificationSettings();
		});

	return router;
})();

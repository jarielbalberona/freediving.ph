import { InferSelectModel, and, desc, eq, count, sql } from "drizzle-orm";

import { NotificationsServerSchemaType, NotificationsUpdateSchemaType, NotificationSettingsSchemaType } from "./notifications.validators";
import { users } from "@/models/drizzle/authentication.model";
import DrizzleService from "@/databases/drizzle/service";
import { notifications, notificationSettings, notificationTemplates } from "@/models/drizzle/notifications.model";
import { ServiceApiResponse, ServiceResponse } from "@/utils/serviceApi";
import { status } from "@/utils/statusCodes";

export type NotificationsSchemaType = InferSelectModel<typeof notifications>;

export default class NotificationsService extends DrizzleService {
	async create(data: NotificationsServerSchemaType) {
		try {
			const createdData = await this.db.insert(notifications).values(data).returning();

			if (!createdData.length) {
				return ServiceResponse.createResponse(
					status.HTTP_406_NOT_ACCEPTABLE,
					"Invalid notification data",
					createdData[0]
				);
			}

			return ServiceResponse.createResponse(
				status.HTTP_201_CREATED,
				"Notification created successfully",
				createdData[0]
			);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	async retrieve(id: number): Promise<ServiceApiResponse<NotificationsSchemaType>> {
		try {
			const retrieveData = await this.db.query.notifications.findFirst({
				where: eq(notifications.id, id),
				with: {
					user: {
						columns: {
							id: true,
							username: true,
							email: true,
							alias: true,
						},
					},
				},
			});

			if (!retrieveData) {
				return ServiceResponse.createRejectResponse(
					status.HTTP_404_NOT_FOUND,
					"Notification not found"
				);
			}

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Notification retrieved successfully",
				retrieveData
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async update(id: number, data: NotificationsUpdateSchemaType) {
		try {
			const updatedData = await this.db.update(notifications).set(data).where(eq(notifications.id, id)).returning();

			if (!updatedData.length) {
				return ServiceResponse.createResponse(
					status.HTTP_406_NOT_ACCEPTABLE,
					"Invalid notification id",
					updatedData[0]
				);
			}

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Notification updated successfully",
				updatedData[0]
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async retrieveAll() {
		try {
			const retrieveData = await this.db
				.select({
					notification: notifications,
					user: {
						id: users.id,
						username: users.username,
						email: users.email,
						alias: users.alias,
					},
				})
				.from(notifications)
				.leftJoin(users, eq(notifications.userId, users.id))
				.orderBy(desc(notifications.createdAt));

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Notifications retrieved successfully",
				retrieveData
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async getUserNotifications(userId: number) {
		try {
			const retrieveData = await this.db
				.select({
					notification: notifications,
					user: {
						id: users.id,
						username: users.username,
						email: users.email,
						alias: users.alias,
					},
				})
				.from(notifications)
				.leftJoin(users, eq(notifications.userId, users.id))
				.where(eq(notifications.userId, userId))
				.orderBy(desc(notifications.createdAt));

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"User notifications retrieved successfully",
				retrieveData
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async markAsRead(id: number) {
		try {
			const updatedData = await this.db
				.update(notifications)
				.set({
					status: "READ",
					readAt: new Date()
				})
				.where(eq(notifications.id, id))
				.returning();

			if (!updatedData.length) {
				return ServiceResponse.createResponse(
					status.HTTP_404_NOT_FOUND,
					"Notification not found",
					null
				);
			}

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Notification marked as read",
				updatedData[0]
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async markAllAsRead(userId: number) {
		try {
			const updatedData = await this.db
				.update(notifications)
				.set({
					status: "READ",
					readAt: new Date()
				})
				.where(eq(notifications.userId, userId))
				.returning();

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"All notifications marked as read",
				{ count: updatedData.length }
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async deleteNotification(id: number) {
		try {
			const deletedData = await this.db
				.delete(notifications)
				.where(eq(notifications.id, id))
				.returning();

			if (!deletedData.length) {
				return ServiceResponse.createResponse(
					status.HTTP_404_NOT_FOUND,
					"Notification not found",
					null
				);
			}

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Notification deleted successfully",
				deletedData[0]
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	// Notification Settings methods
	async getNotificationSettings(userId: number) {
		try {
			const retrieveData = await this.db.query.notificationSettings.findFirst({
				where: eq(notificationSettings.userId, userId),
			});

			if (!retrieveData) {
				// Create default settings if none exist
				const defaultSettings = await this.db.insert(notificationSettings).values({
					userId,
					type: "SYSTEM",
					enabled: true,
					emailEnabled: true,
					pushEnabled: true,
					smsEnabled: false
				}).returning();

				return ServiceResponse.createResponse(
					status.HTTP_200_OK,
					"Default notification settings created",
					defaultSettings[0]
				);
			}

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Notification settings retrieved successfully",
				retrieveData
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async updateNotificationSettings(userId: number, data: NotificationSettingsSchemaType) {
		try {
			const updatedData = await this.db
				.update(notificationSettings)
				.set(data)
				.where(eq(notificationSettings.userId, userId))
				.returning();

			if (!updatedData.length) {
				// Create settings if they don't exist
				const createdData = await this.db.insert(notificationSettings).values({
					userId,
					type: "SYSTEM",
					enabled: true,
					emailEnabled: data.emailEnabled ?? true,
					pushEnabled: data.pushEnabled ?? true,
					smsEnabled: false
				}).returning();

				return ServiceResponse.createResponse(
					status.HTTP_201_CREATED,
					"Notification settings created successfully",
					createdData[0]
				);
			}

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Notification settings updated successfully",
				updatedData[0]
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async getUnreadCount(userId: number) {
		try {
			const result = await this.db
				.select({ count: count() })
				.from(notifications)
				.where(and(eq(notifications.userId, userId), eq(notifications.status, "UNREAD")));

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Unread count retrieved successfully",
				{ unreadCount: result[0]?.count || 0 }
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}
}

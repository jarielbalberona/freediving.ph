import { Request, Response } from "express";
import { hasMinimumGlobalRole, type GlobalRole } from "@freediving.ph/config";

import NotificationsService from "@/app/notifications/notifications.service";
import { NotificationsServerSchema, NotificationsUpdateSchema, NotificationSettingsSchema } from "@/app/notifications/notifications.validators";

import { ApiController } from "@/controllers/base/api.controller";
import { ServiceApiResponse } from "@/utils/serviceApi";

export default class NotificationsController extends ApiController {
	protected notificationsService: NotificationsService;
	private isAdminRole(role: GlobalRole | null | undefined) {
		if (!role) return false;
		return hasMinimumGlobalRole(role, "admin");
	}

	constructor(request: Request, response: Response) {
		super(request, response);
		this.notificationsService = new NotificationsService();
	}

	async createNotification() {
		try {
			const body = this.request.body;
			const check = NotificationsServerSchema.safeParse(body);
			if (!check.success)
				return this.validationError(check.error);

			const response = await this.notificationsService.create(check.data);
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async getNotificationById() {
		try {
			const id = Number(this.request.params.id);
			const response = await this.notificationsService.retrieve(id);
			if (response.data && !this.isAdminRole(this.request.context!.globalRole)) {
				const ownerUserId = (response.data as { userId?: number }).userId;
				if (ownerUserId !== this.request.context!.appUserId!) {
					return this.apiResponse.forbiddenResponse("Cannot access another user's notifications");
				}
			}
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async getAllNotifications() {
		try {
			const response = await this.notificationsService.retrieveAll();
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async getUserNotifications() {
		try {
			const userId = Number(this.request.params.userId);
			if (userId !== this.request.context!.appUserId! && !this.isAdminRole(this.request.context!.globalRole)) {
				return this.apiResponse.forbiddenResponse("Cannot access another user's notifications");
			}
			const response = await this.notificationsService.getUserNotifications(userId);
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async updateNotification() {
		try {
			const id = Number(this.request.params.id);
			const existing = await this.notificationsService.retrieve(id);
			if (existing.data && !this.isAdminRole(this.request.context!.globalRole)) {
				const ownerUserId = (existing.data as { userId?: number }).userId;
				if (ownerUserId !== this.request.context!.appUserId!) {
					return this.apiResponse.forbiddenResponse("Cannot modify another user's notification");
				}
			}
			const body = this.request.body;
			const check = NotificationsUpdateSchema.safeParse(body);
			if (!check.success)
				return this.validationError(check.error);

			const response = await this.notificationsService.update(id, check.data);
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async markAsRead() {
		try {
			const id = Number(this.request.params.id);
			const existing = await this.notificationsService.retrieve(id);
			if (existing.data && !this.isAdminRole(this.request.context!.globalRole)) {
				const ownerUserId = (existing.data as { userId?: number }).userId;
				if (ownerUserId !== this.request.context!.appUserId!) {
					return this.apiResponse.forbiddenResponse("Cannot modify another user's notification");
				}
			}
			const response = await this.notificationsService.markAsRead(id);
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async markAllAsRead() {
		try {
			const userId = Number(this.request.params.userId);
			if (userId !== this.request.context!.appUserId! && !this.isAdminRole(this.request.context!.globalRole)) {
				return this.apiResponse.forbiddenResponse("Cannot modify another user's notifications");
			}
			const response = await this.notificationsService.markAllAsRead(userId);
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async deleteNotification() {
		try {
			const id = Number(this.request.params.id);
			const existing = await this.notificationsService.retrieve(id);
			if (existing.data && !this.isAdminRole(this.request.context!.globalRole)) {
				const ownerUserId = (existing.data as { userId?: number }).userId;
				if (ownerUserId !== this.request.context!.appUserId!) {
					return this.apiResponse.forbiddenResponse("Cannot delete another user's notification");
				}
			}
			const response = await this.notificationsService.deleteNotification(id);
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async getNotificationSettings() {
		try {
			const userId = Number(this.request.params.userId);
			if (userId !== this.request.context!.appUserId! && !this.isAdminRole(this.request.context!.globalRole)) {
				return this.apiResponse.forbiddenResponse("Cannot access another user's settings");
			}
			const response = await this.notificationsService.getNotificationSettings(userId);
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async updateNotificationSettings() {
		try {
			const userId = Number(this.request.params.userId);
			if (userId !== this.request.context!.appUserId! && !this.isAdminRole(this.request.context!.globalRole)) {
				return this.apiResponse.forbiddenResponse("Cannot modify another user's settings");
			}
			const body = this.request.body;
			const check = NotificationSettingsSchema.safeParse(body);
			if (!check.success)
				return this.validationError(check.error);

			const response = await this.notificationsService.updateNotificationSettings(userId, check.data);
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async getUnreadCount() {
		try {
			const userId = Number(this.request.params.userId);
			if (userId !== this.request.context!.appUserId! && !this.isAdminRole(this.request.context!.globalRole)) {
				return this.apiResponse.forbiddenResponse("Cannot access another user's unread count");
			}
			const response = await this.notificationsService.getUnreadCount(userId);
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}
}

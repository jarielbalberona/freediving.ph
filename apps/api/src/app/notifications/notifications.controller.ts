import { Request, Response } from "express";

import NotificationsService from "@/app/notifications/notifications.service";
import { NotificationsServerSchema, NotificationsUpdateSchema, NotificationSettingsSchema } from "@/app/notifications/notifications.validators";

import { ApiController } from "@/controllers/base/api.controller";
import { ServiceApiResponse } from "@/utils/serviceApi";

export default class NotificationsController extends ApiController {
	protected notificationsService: NotificationsService;

	constructor(request: Request, response: Response) {
		super(request, response);
		this.notificationsService = new NotificationsService();
	}

	async createNotification() {
		try {
			const body = this.request.body;
			const check = NotificationsServerSchema.safeParse(body);
			if (!check.success)
				return this.apiResponse.badResponse(check.error.errors.map(err => err.message).join("\n"));

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
			const response = await this.notificationsService.getUserNotifications(userId);
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async updateNotification() {
		try {
			const id = Number(this.request.params.id);
			const body = this.request.body;
			const check = NotificationsUpdateSchema.safeParse(body);
			if (!check.success)
				return this.apiResponse.badResponse(check.error.errors.map(err => err.message).join("\n"));

			const response = await this.notificationsService.update(id, check.data);
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async markAsRead() {
		try {
			const id = Number(this.request.params.id);
			const response = await this.notificationsService.markAsRead(id);
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async markAllAsRead() {
		try {
			const userId = Number(this.request.params.userId);
			const response = await this.notificationsService.markAllAsRead(userId);
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async deleteNotification() {
		try {
			const id = Number(this.request.params.id);
			const response = await this.notificationsService.deleteNotification(id);
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async getNotificationSettings() {
		try {
			const userId = Number(this.request.params.userId);
			const response = await this.notificationsService.getNotificationSettings(userId);
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async updateNotificationSettings() {
		try {
			const userId = Number(this.request.params.userId);
			const body = this.request.body;
			const check = NotificationSettingsSchema.safeParse(body);
			if (!check.success)
				return this.apiResponse.badResponse(check.error.errors.map(err => err.message).join("\n"));

			const response = await this.notificationsService.updateNotificationSettings(userId, check.data);
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async getUnreadCount() {
		try {
			const userId = Number(this.request.params.userId);
			const response = await this.notificationsService.getUnreadCount(userId);
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}
}

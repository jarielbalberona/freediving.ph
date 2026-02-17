import type { Request, Response } from "express";

import { ApiController } from "@/controllers/base/api.controller";
import type { ServiceApiResponse } from "@/utils/serviceApi";

import ModerationService from "./moderation.service";
import {
	ModerateFeatureRestrictionSchema,
	ModerateThreadActionSchema,
	ModerateUserSuspensionSchema
} from "./moderation.validators";

export default class ModerationController extends ApiController {
	protected moderationService: ModerationService;

	constructor(request: Request, response: Response) {
		super(request, response);
		this.moderationService = new ModerationService();
	}

	async lockThread() {
		try {
			const threadId = Number(this.request.params.threadId);
			const check = ModerateThreadActionSchema.safeParse(this.request.body);
			if (!check.success) return this.validationError(check.error);

			const response = await this.moderationService.lockThread(this.request.user.id, threadId, check.data);
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async removeThread() {
		try {
			const threadId = Number(this.request.params.threadId);
			const check = ModerateThreadActionSchema.safeParse(this.request.body);
			if (!check.success) return this.validationError(check.error);

			const response = await this.moderationService.removeThread(this.request.user.id, threadId, check.data);
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async suspendUser() {
		try {
			const userId = Number(this.request.params.userId);
			const check = ModerateUserSuspensionSchema.safeParse(this.request.body);
			if (!check.success) return this.validationError(check.error);

			const response = await this.moderationService.setUserSuspension(this.request.user.id, userId, check.data);
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async setUserFeatureRestriction() {
		try {
			const userId = Number(this.request.params.userId);
			const check = ModerateFeatureRestrictionSchema.safeParse(this.request.body);
			if (!check.success) return this.validationError(check.error);

			const response = await this.moderationService.setFeatureRestriction(this.request.user.id, userId, check.data);
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async revealThreadPseudonyms() {
		try {
			const threadId = Number(this.request.params.threadId);
			const response = await this.moderationService.revealThreadPseudonyms(threadId);
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}
}

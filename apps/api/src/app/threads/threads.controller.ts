import { Request, Response } from "express";

import ThreadsService from "@/app/threads/threads.service";
import {
	ThreadsServerSchema,
	ThreadsUpdateSchema,
	CommentCreateSchema,
	ReactionSchema,
	ThreadModeSchema,
	ThreadListQuerySchema,
	ThreadCommentsQuerySchema
} from "@/app/threads/threads.validators";

import { ApiController } from "@/controllers/base/api.controller";
import { ServiceApiResponse } from "@/utils/serviceApi";

export default class ThreadsController extends ApiController {
	protected threadsService: ThreadsService;
	/**
	 * Construct the controller
	 *
	 * @param request
	 * @param response
	 */
	constructor(request: Request, response: Response) {
		super(request, response);
		this.threadsService = new ThreadsService();
	}

	async createThreads() {
		try {
			const body = this.request.body;
			const check = ThreadsServerSchema.safeParse(body);
			if (!check.success)
				return this.validationError(check.error);

			const response = await this.threadsService.create({
				...check.data,
				userId: this.request.context!.appUserId!
			});

			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async retrieveThreads() {
		try {
			const id = Number(this.request.params.id);
			const response = await this.threadsService.retrieve(
				id,
				this.request.context?.appUserId ?? null,
				this.request.context?.globalRole ?? null
			);

			// await this.threadsService.testThreads(response.data.id);

			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async updateThreads() {
		try {
			const id = Number(this.request.params.id);
			const body = this.request.body;
			const check = ThreadsUpdateSchema.safeParse(body);
			if (!check.success)
				return this.validationError(check.error);

			const response = await this.threadsService.update(
				id,
				this.request.context!.appUserId!,
				this.request.context!.globalRole,
				check.data
			);

			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async retrieveAllThreads() {
		try {
			const queryCheck = ThreadListQuerySchema.safeParse(this.request.query);
			if (!queryCheck.success) return this.validationError(queryCheck.error);

			const response = await this.threadsService.retrieveAll(
				queryCheck.data,
				this.request.context?.appUserId ?? null,
				this.request.context?.globalRole ?? null
			);
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async deleteThreads() {
		try {
			const id = Number(this.request.params.id);
			const response = await this.threadsService.delete(id, this.request.context!.appUserId!, this.request.context!.globalRole);
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	// Comments methods
	async createComment() {
		try {
			const body = this.request.body;
			const check = CommentCreateSchema.safeParse(body);
			if (!check.success)
				return this.validationError(check.error);

			const response = await this.threadsService.createComment({
				...check.data,
				userId: this.request.context!.appUserId!
			});
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async getComments() {
		try {
			const threadId = Number(this.request.params.id);
			const queryCheck = ThreadCommentsQuerySchema.safeParse(this.request.query);
			if (!queryCheck.success) return this.validationError(queryCheck.error);

			const response = await this.threadsService.getComments(
				threadId,
				queryCheck.data,
				this.request.context?.appUserId ?? null,
				this.request.context?.globalRole ?? null
			);
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	// Reactions methods
	async addReaction() {
		try {
			const threadId = Number(this.request.params.id);
			const body = this.request.body;
			const check = ReactionSchema.safeParse(body);
			if (!check.success)
				return this.validationError(check.error);

			const response = await this.threadsService.addReaction(threadId, {
				...check.data,
				userId: this.request.context!.appUserId!
			});
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async removeReaction() {
		try {
			const threadId = Number(this.request.params.id);
			const userId = this.request.context?.appUserId;

			if (!userId) {
				return this.apiResponse.badResponse("User ID is required");
			}

			const response = await this.threadsService.removeReaction(threadId, userId);
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async setThreadMode() {
		try {
			const threadId = Number(this.request.params.id);
			const check = ThreadModeSchema.safeParse(this.request.body);
			if (!check.success)
				return this.validationError(check.error);

			const response = await this.threadsService.setThreadMode(
				threadId,
				check.data.mode,
				this.request.context!.appUserId!,
				this.request.context!.globalRole
			);
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async getOwnPseudonym() {
		try {
			const threadId = Number(this.request.params.id);
			const response = await this.threadsService.getOrCreatePseudonym(threadId, this.request.context!.appUserId!);
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}
}
